import { Hashing } from 'dcl-catalyst-commons'
import { BodyShapeType } from '../item/types'
import { THUMBNAIL_PATH } from '../item/constants'
import { HashedContent, RawContent, SortedContent } from './types'

// TODO: compute hashes could be extracted to a common library
export async function computeHashes(
  contents: RawContent
): Promise<HashedContent> {
  const filePaths = Object.keys(contents)
  const fileHashes = await Promise.all(
    filePaths.map(async (path) => {
      const blob = contents[path]
      const file = await makeContentFile(path, blob)
      return calculateBufferHash(file.content)
    })
  )

  return filePaths.reduce((hashes, path, index) => {
    hashes[path] = fileHashes[index]
    return hashes
  }, {})
}

async function calculateBufferHash(buffer: Uint8Array): Promise<string> {
  return Hashing.calculateIPFSHash(buffer)
}

async function makeContentFile(
  path: string,
  content: string | Uint8Array
): Promise<{ name: string; content: Uint8Array }> {
  if (typeof content === 'string') {
    // This shouldn't work in the browser
    const buffer = Buffer.from(content)
    return { name: path, content: buffer }
  } else if (content instanceof Uint8Array) {
    return { name: path, content }
  }
  throw new Error(
    'Unable to create ContentFile: content must be a string, or a Uint8Array'
  )
}

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
 *
 * @param bodyShape - The body shaped used to sort the content.
 * @param contents - The contents to be sorted.
 */
export function sortContent(
  bodyShape: BodyShapeType,
  contents: RawContent
): SortedContent {
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
 *
 * @param bodyShape - The body shaped used to prefix the content names.
 * @param contents - The contents which keys are going to be prefixed.
 */
function prefixContents(
  bodyShape: BodyShapeType,
  contents: RawContent
): RawContent {
  return Object.keys(contents).reduce(
    (newContents: RawContent, key: string) => {
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
