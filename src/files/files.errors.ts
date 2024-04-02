import { ErrorObject } from 'ajv'
import { FileType } from './types'

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
  public geFileName(): string {
    return this.fileName
  }
  public geFileSize(): number {
    return this.fileSize
  }
  public getMaxFileSize(): number {
    return this.maxFileSize
  }
  public getType(): FileType {
    return this.type
  }

  constructor(
    private fileName: string,
    private fileSize: number,
    private maxFileSize: number,
    private type: FileType
  ) {
    super(
      `The file ${fileName} too big (${fileSize} bytes) but should be less than ${maxFileSize} bytes for the ${type} type.`
    )
  }
}

export class InvalidBuilderConfigFileError extends Error {
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
    super('The builder config file is invalid')
  }
}

export class InvalidWearableConfigFileError extends Error {
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
    super('The wearable config file is invalid')
  }
}

export class InvalidSceneConfigFileError extends Error {
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
    super('The scene config file is invalid')
  }
}

export class FileNotFoundError extends Error {
  constructor(fileName: string) {
    super(`The file ${fileName} does not exist.`)
  }
}

export class UnknownRequiredPermissionsError extends Error {
  public getUnknownRequiredPermissions(): string[] {
    return this.unknownRequiredPermissions
  }

  constructor(private unknownRequiredPermissions: string[]) {
    super(
      `The following required permissions do not exist: ${unknownRequiredPermissions}.`
    )
  }
}

export class DuplicatedRequiredPermissionsError extends Error {
  public getDuplicatedRequiredPermissions(): string[] {
    return this.duplicatedRequiredPermissions
  }

  constructor(private duplicatedRequiredPermissions: string[]) {
    super(
      `Some required permissions are duplicated: ${duplicatedRequiredPermissions}. Please remove the duplicates.`
    )
  }
}

export class AllowedMediaHostnameIsEmptyOrInvalidError extends Error {
  constructor() {
    super("The property 'allowedMediaHostnames' is empty or invalid.")
  }
}

export class MissingRequiredPropertiesError extends Error {
  public getMissingProperties(): string[] {
    return this.missingProperties
  }

  constructor(private missingProperties: string[]) {
    super(`The following required properties are missing: ${missingProperties}`)
  }
}
