import { Hashing } from 'dcl-catalyst-commons'
import toBuffer from 'blob-to-buffer'
import { Blob } from 'buffer'
import { BodyShapeType } from '../item/types'
import { THUMBNAIL_PATH } from '../item/constants'
import { HashedContent, RawContent, SortedContent } from './types'

export const FILE_NAME_BLACKLIST = [
  '.dclignore',
  'Dockerfile',
  'builder.json',
  'src/game.ts'
]

/**
 * Sums the sizes of an array of blobs.
 *
 * @param files - An array of blobs.
 */
export function calculateFilesSize(files: Array<Blob>) {
  return files.reduce((total, blob) => blob.size + total, 0)
}

// TODO: compute hashes must be extracted to a common library
// Improves the speed of this computation by using promises
export async function computeHashes(
  contents: RawContent
): Promise<HashedContent> {
  const filePaths = Object.keys(contents)
  const fileHashes = Promise.all(
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

export async function calculateBufferHash(buffer: Buffer): Promise<string> {
  return Hashing.calculateIPFSHash(buffer)
}

export async function makeContentFiles(
  files: Record<string, string | Blob | Buffer>
): Promise<Map<string, Buffer>> {
  // const makeRequests = []
  // for (const fileName of Object.keys(files)) {
  //   if (FILE_NAME_BLACKLIST.includes(fileName)) continue
  //   makeRequests.push(makeContentFile(fileName, files[fileName]))
  // }
  const contentFiles = await Promise.all(
    Object.keys(files)
      .filter((fileName) => !FILE_NAME_BLACKLIST.includes(fileName))
      .map((fileName) => makeContentFile(fileName, files[fileName]))
  )

  // const contentFiles = await Promise.all(makeRequests)
  return new Map(contentFiles.map(({ name, content }) => [name, content]))
}

export function makeContentFile(
  path: string,
  content: string | Blob
): Promise<{ name: string; content: Buffer }> {
  return new Promise((resolve, reject) => {
    if (typeof content === 'string') {
      const buffer = Buffer.from(content)
      resolve({ name: path, content: buffer })
      // TODO: See what to do with the blob here
    } else if (content instanceof Blob) {
      // TODO: fix this any
      toBuffer(content, (err: Error, buffer: Buffer) => {
        if (err) reject(err)
        resolve({ name: path, content: buffer })
      })
    } else {
      reject(
        new Error(
          'Unable to create ContentFile: content must be a string or a Blob'
        )
      )
    }
  })
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
export function prefixContents(
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
