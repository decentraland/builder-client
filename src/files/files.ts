import JSZip from 'jszip'
import { basename } from 'path'
import Ajv from 'ajv'
import addAjvFormats from 'ajv-formats'
import { Content, RawContent } from '../content/types'
import { THUMBNAIL_PATH } from '../item/constants'
import { TextDecoder as NodeTextDecoder } from 'util'
import { ASSET_MANIFEST, MAX_FILE_SIZE } from './constants'
import { AssetJSON, LoadedFile } from './types'
import { AssetJSONSchema } from './schemas'
import {
  FileNotFoundError,
  FileTooBigError,
  InvalidAssetFileError,
  ModelFileNotFoundError,
  ModelInRepresentationNotFoundError,
  WrongExtensionError
} from './files.errors'

const ajv = new Ajv()
addAjvFormats(ajv)
const validator = ajv.addSchema(AssetJSONSchema, 'AssetJSON')

export async function loadFile<T extends Content>(
  fileName: string,
  file: T
): Promise<LoadedFile<T>> {
  const extension = getExtension(fileName)
  if (extension === '.zip') {
    return handleZippedModelFiles(file)
  } else if (isModelPath(fileName)) {
    return handleFileModel(fileName, file)
  } else {
    throw new WrongExtensionError(fileName)
  }
}

function getExtension(fileName: string) {
  const matches = fileName.match(/\.[0-9a-z]+$/i)
  const extension = matches ? matches[0] : null
  return extension
}

function isImageFile(fileName: string) {
  return fileName.toLowerCase().endsWith('.png')
}

function isModelFile(fileName: string) {
  fileName = fileName.toLowerCase()
  return fileName.endsWith('.gltf') || fileName.endsWith('.glb')
}

function isModelPath(fileName: string) {
  fileName = fileName.toLowerCase()
  // we ignore PNG files that end with "_mask", since those are auxiliary
  const isMask = fileName.includes('_mask')
  return (
    isModelFile(fileName) ||
    (fileName.indexOf(THUMBNAIL_PATH) === -1 &&
      !isMask &&
      isImageFile(fileName))
  )
}

/**
 * Unzips files and build the content record and asset config.
 * One of the models will be taken into consideration if multiple models are uploaded.
 *
 * @param zipFile - The ZIP file.
 */
async function handleZippedModelFiles<T extends Content>(
  zipFile: T,
  asBlob = false
): Promise<LoadedFile<T>> {
  const zip: JSZip = await JSZip.loadAsync(zipFile)

  const fileNames: string[] = []
  const promiseOfFileContents: Array<Promise<T>> = []

  zip.forEach((filePath, file) => {
    if (
      !basename(filePath).startsWith('.') &&
      basename(filePath) !== ASSET_MANIFEST
    ) {
      fileNames.push(filePath)
      promiseOfFileContents.push(
        file.async(asBlob ? 'blob' : 'uint8array') as Promise<T>
      )
    }
  })

  const fileContents = await Promise.all(promiseOfFileContents)
  const content: RawContent<T> = fileNames.reduce((acc, fileName, index) => {
    let size: number

    if (globalThis.Blob && fileContents[index] instanceof globalThis.Blob) {
      size = (fileContents[index] as Blob).size
    } else {
      size = (fileContents[index] as Uint8Array).length
    }

    if (size > MAX_FILE_SIZE) {
      throw new FileTooBigError(fileName, size)
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
      if (!representation.contents.includes(representation.mainFile)) {
        throw new ModelInRepresentationNotFoundError(representation.mainFile)
      }

      representation.contents.forEach((content) => {
        if (!zip.file(representation.mainFile)) {
          throw new FileNotFoundError(content)
        }
      })
    })

    return { content, asset }
  } else {
    const mainModelFile = fileNames.find(isModelPath)
    if (!mainModelFile) {
      throw new ModelFileNotFoundError()
    }

    return { content, mainModel: mainModelFile }
  }
}

function handleFileModel<T extends Content>(
  fileName: string,
  file: T
): LoadedFile<T> {
  return { content: { [fileName]: file }, mainModel: fileName }
}

async function loadAssetJSON<T extends Content>(file: T): Promise<AssetJSON> {
  let content: string
  if (globalThis.Blob && file instanceof globalThis.Blob) {
    content = await (file as Blob).text()
  } else if (globalThis.TextDecoder) {
    content = new TextDecoder('utf-8').decode(file as Uint8Array)
  } else {
    content = new NodeTextDecoder('utf-8').decode(file as Uint8Array)
  }

  const parsedContent = JSON.parse(content)
  if (!validator.validate('AssetJSON', parsedContent)) {
    throw new InvalidAssetFileError(validator.errors)
  }
  return parsedContent
}
