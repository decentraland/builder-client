import JSZip, { OutputType } from 'jszip'
import { basename } from 'path'
import Ajv from 'ajv'
import addAjvFormats from 'ajv-formats'
import { Content, RawContent } from '../content/types'
import { THUMBNAIL_PATH } from '../item/constants'
import { TextDecoder as NodeTextDecoder } from 'util'
import { WEARABLE_MANIFEST, MAX_FILE_SIZE, BUILDER_MANIFEST } from './constants'
import { WearableConfig, LoadedFile, BuilderConfig } from './types'
import { WearableConfigSchema, BuilderConfigSchema } from './schemas'
import {
  FileNotFoundError,
  FileTooBigError,
  InvalidBuilderConfigFileError,
  InvalidWearableConfigFileError,
  ModelFileNotFoundError,
  ModelInRepresentationNotFoundError,
  WrongExtensionError
} from './files.errors'

const ajv = new Ajv()
addAjvFormats(ajv)
const validator = ajv
  .addSchema(WearableConfigSchema, 'WearableConfig')
  .addSchema(BuilderConfigSchema, 'BuilderConfig')

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
  zipFile: T
): Promise<LoadedFile<T>> {
  const zip: JSZip = await JSZip.loadAsync(zipFile)

  const fileNames: string[] = []
  const promiseOfFileContents: Array<Promise<T>> = []
  let fileFormat: OutputType
  if (globalThis.Blob && zipFile instanceof globalThis.Blob) {
    fileFormat = 'blob'
  } else if (Buffer.isBuffer(zipFile)) {
    fileFormat = 'nodebuffer'
  } else if (zipFile instanceof Uint8Array) {
    fileFormat = 'uint8array'
  } else if (zipFile instanceof ArrayBuffer) {
    fileFormat = 'arraybuffer'
  }

  zip.forEach((filePath, file) => {
    if (
      !basename(filePath).startsWith('.') &&
      basename(filePath) !== WEARABLE_MANIFEST &&
      basename(filePath) !== BUILDER_MANIFEST
    ) {
      fileNames.push(filePath)
      promiseOfFileContents.push(file.async(fileFormat) as Promise<T>)
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

  let wearable: WearableConfig | undefined = undefined
  let builder: BuilderConfig | undefined = undefined

  const wearableZipFile = zip.file(WEARABLE_MANIFEST)
  const builderZipFile = zip.file(BUILDER_MANIFEST)

  if (wearableZipFile) {
    const wearableFileContents = await wearableZipFile.async('uint8array')
    wearable = await loadWearableConfig(wearableFileContents)
    wearable.data.representations.forEach((representation) => {
      if (!representation.contents.includes(representation.mainFile)) {
        throw new ModelInRepresentationNotFoundError(representation.mainFile)
      }

      representation.contents.forEach((content) => {
        if (!zip.file(representation.mainFile)) {
          throw new FileNotFoundError(content)
        }
      })
    })
  }

  if (builderZipFile) {
    const builderZipFileContents = await builderZipFile.async('uint8array')
    builder = await loadBuilderConfig(builderZipFileContents)
  }

  let result: LoadedFile<T> = { content }

  if (builder) {
    result = { ...result, builder }
  }

  if (wearable) {
    result = { ...result, wearable }
  } else {
    const mainModelFile = fileNames.find(isModelPath)
    if (!mainModelFile) {
      throw new ModelFileNotFoundError()
    }
    result = { ...result, mainModel: mainModelFile }
  }

  return result
}

function handleFileModel<T extends Content>(
  fileName: string,
  file: T
): LoadedFile<T> {
  return { content: { [fileName]: file }, mainModel: fileName }
}

async function readContent<T extends Content>(file: T): Promise<string> {
  if (globalThis.Blob && file instanceof globalThis.Blob) {
    return (file as Blob).text()
  } else if (globalThis.TextDecoder) {
    return new TextDecoder('utf-8').decode(file as Uint8Array)
  }
  return new NodeTextDecoder('utf-8').decode(file as Uint8Array)
}

async function loadBuilderConfig<T extends Content>(
  file: T
): Promise<BuilderConfig> {
  const content = await readContent(file)
  const parsedContent = JSON.parse(content)
  if (!validator.validate('BuilderConfig', parsedContent)) {
    throw new InvalidBuilderConfigFileError(validator.errors)
  }
  return parsedContent
}

async function loadWearableConfig<T extends Content>(
  file: T
): Promise<WearableConfig> {
  const content = await readContent(file)
  const parsedContent = JSON.parse(content)
  if (!validator.validate('WearableConfig', parsedContent)) {
    throw new InvalidWearableConfigFileError(validator.errors)
  }
  return parsedContent
}
