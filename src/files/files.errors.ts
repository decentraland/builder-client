import { ErrorObject } from 'ajv'
import { MAX_FILE_SIZE } from './constants'

export class WrongExtensionError extends Error {
  constructor(file: string) {
    super(`The file ${file} has a wrong extension`)
  }
}

export class ModelFileNotFoundError extends Error {
  constructor() {
    super('The file does not contain a model file')
  }
}

export class FileTooBigError extends Error {
  constructor(fileName: string, fileSize: number) {
    super(
      `The file ${fileName} too big (${fileSize} bytes) but should be less than ${MAX_FILE_SIZE} bytes`
    )
  }
}

export class InvalidAssetFileError extends Error {
  public getErrors():
    | ErrorObject<string, Record<string, unknown>, unknown>[]
    | null
    | undefined {
    return this.errors
  }

  constructor(
    private errors?:
      | ErrorObject<string, Record<string, unknown>, unknown>[]
      | null
  ) {
    super('The asset file is invalid')
  }
}

export class FileNotFoundError extends Error {
  constructor(fileName: string) {
    super(`The file ${fileName} does not exist.`)
  }
}

export class ModelInRepresentationNotFoundError extends Error {
  constructor(fileName: string) {
    super(
      `The representation doesn't contain the file ${fileName} as its contents.`
    )
  }
}
