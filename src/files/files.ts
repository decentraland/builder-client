import JSZip from 'jszip'
import { basename } from 'path'
import Ajv from 'ajv'
import { RawContent } from '../content/types'
import { ASSET_MANIFEST, MAX_FILE_SIZE } from './constants'
import { AssetJSON } from './types'
import { AssetJSONSchema } from './schemas'

const ajv = new Ajv()
const validator = ajv.addSchema(AssetJSONSchema, 'AssetJSON')

function getExtension(fileName: string) {
  const matches = fileName.match(/\.[0-9a-z]+$/i)
  const extension = matches ? matches[0] : null
  return extension
}

export async function loadFile(
  fileName: string,
  file: Uint8Array | Blob
): Promise<{ content: RawContent; asset?: AssetJSON }> {
  const extension = getExtension(fileName)
  if (extension === '.zip') {
    return handleZippedModelFiles(file)
  } else {
    return { content: handleFileModel(fileName, file) }
  }
}

/**
 * Unzip files and build the content record and asset config.
 * One of the models will be taken into consideration if multiple models are uploaded.
 *
 * @param zipFile - The ZIP file.
 */
async function handleZippedModelFiles(
  zipFile: Uint8Array | Blob,
  asBlob: boolean = false
): Promise<{ content: RawContent; asset?: AssetJSON }> {
  const zip: JSZip = await JSZip.loadAsync(zipFile)

  const fileNames: string[] = []
  const promiseOfFileContents: Array<Promise<Uint8Array | Blob>> = []

  zip.forEach((filePath, file) => {
    if (
      !basename(filePath).startsWith('.') &&
      basename(filePath) !== ASSET_MANIFEST
    ) {
      fileNames.push(filePath)
      promiseOfFileContents.push(file.async(asBlob ? 'blob' : 'uint8array'))
    }
  })

  const fileContents = await Promise.all(promiseOfFileContents)
  const content: RawContent = fileNames.reduce((acc, fileName, index) => {
    let size: number

    if (globalThis.Blob && fileContents[index] instanceof globalThis.Blob) {
      size = (fileContents[index] as Blob).size
    } else {
      size = (fileContents[index] as Uint8Array).length
    }

    if (size > MAX_FILE_SIZE) {
      throw new Error('File too big')
    }

    acc[fileName] = fileContents[index]
    return acc
  }, {})

  let asset: AssetJSON | undefined = undefined
  const assetZipFile = zip.file(ASSET_MANIFEST)
  if (assetZipFile) {
    const assetFileContents = await assetZipFile.async('uint8array')
    asset = await loadAssetJSON(assetFileContents)
    asset.representations.forEach((representation) => {
      if (zip.file(representation.mainFile)) {
        throw new Error('Asset file contains a model file')
      }
    })
  }

  return { content, asset }
}

function handleFileModel(
  fileName: string,
  file: Uint8Array | Blob
): RawContent {
  return { [fileName]: file }
}

function loadAssetJSON(file: Uint8Array): Promise<AssetJSON> {
  const content = file.toString()
  const parsedContent = JSON.parse(content)
  if (!validator.validate('AssetJSON', parsedContent)) {
    throw new Error('Invalid schema')
  }
  return parsedContent
}
