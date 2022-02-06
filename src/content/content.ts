import { Hashing } from 'dcl-catalyst-commons'
import { Buffer } from 'buffer'
import { BodyShapeType } from '../item/types'
import { THUMBNAIL_PATH } from '../item/constants'
import { Content, HashedContent, RawContent, SortedContent } from './types'

/**
 * Computes the hashes of RawContents.
 * @param contents - The raw contents of an item.
 */
export async function computeHashes<T extends Content>(
  contents: RawContent<T>
): Promise<HashedContent> {
  const filePaths = Object.keys(contents)
  const fileHashes = await Promise.all(
    filePaths.map(async (path) => {
      const blob = contents[path]
      const file = await makeContentFile(path, blob)
      return Hashing.calculateIPFSHash(file.content)
    })
  )

  return filePaths.reduce((hashes, path, index) => {
    hashes[path] = fileHashes[index]
    return hashes
  }, {})
}

/**
 * Creates a content file to later perform a hash on it.
 * @param path - The path of the content file.
 * @param content - The content of the file.
 */
async function makeContentFile(
  path: string,
  content: string | Uint8Array | Blob | ArrayBuffer | Buffer
): Promise<{ name: string; content: Uint8Array }> {
  if (typeof content === 'string') {
    // This must be polyfilled in the browser
    const buffer = Buffer.from(content)
    return { name: path, content: buffer }
  } else if (globalThis.Blob && content instanceof globalThis.Blob) {
    // Blob can only be used in the browser
    const buffer = await content.arrayBuffer()
    return { name: path, content: new Uint8Array(buffer) }
  } else if (content instanceof Uint8Array) {
    return { name: path, content }
  } else if (content instanceof ArrayBuffer) {
    return { name: path, content: new Uint8Array(content) }
  } else if (Buffer.isBuffer(content)) {
    return { name: path, content: new Uint8Array(content) }
  }
  throw new Error(
    'Unable to create ContentFile: content must be a string, a Blob or a Uint8Array'
  )
}

/**
 * Prefixes a content name using the body shape.
 * @param bodyShape - The body shaped of the content.
 * @param contentKey - The name of the content.
 */
export function prefixContentName(
  bodyShape: BodyShapeType,
  contentKey: string
): string {
  return `${bodyShape}/${contentKey}`
}

/**
 * Sorts the content into "male", "female" and "all" taking into consideration the body shape.
 * All contains the item thumbnail and both male and female representations according to the shape.
 * If the body representation is male, "female" will be an empty object and viceversa.
 * @param bodyShape - The body shaped used to sort the content.
 * @param contents - The contents to be sorted.
 */
export function sortContent<T extends Content>(
  bodyShape: BodyShapeType,
  contents: RawContent<T>
): SortedContent<T> {
  const male =
    bodyShape === BodyShapeType.BOTH || bodyShape === BodyShapeType.MALE
      ? prefixContents(BodyShapeType.MALE, contents)
      : {}
  const female =
    bodyShape === BodyShapeType.BOTH || bodyShape === BodyShapeType.FEMALE
      ? prefixContents(BodyShapeType.FEMALE, contents)
      : {}
  const all = {
    [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH],
    ...male,
    ...female
  }

  return { male, female, all }
}

/**
 * Creates a new contents record with the names of the contents blobs record prefixed.
 * The names need to be prefixed so they won't collide with other
 * pre-uploaded models. The name of the content is the name of the uploaded file.
 * @param bodyShape - The body shaped used to prefix the content names.
 * @param contents - The contents which keys are going to be prefixed.
 */
function prefixContents<T extends Content>(
  bodyShape: BodyShapeType,
  contents: RawContent<T>
): RawContent<T> {
  return Object.keys(contents).reduce(
    (newContents: RawContent<T>, key: string) => {
      // Do not include the thumbnail in each of the body shapes
      if (key === THUMBNAIL_PATH) {
        return newContents
      }
      newContents[prefixContentName(bodyShape, key)] = contents[key]
      return newContents
    },
    {}
  )
}
