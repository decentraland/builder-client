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
  constructor(unknownRequiredPermissions: string[]) {
    super(
      `The following required permissions do not exist: ${unknownRequiredPermissions.join(
        ', '
      )}.`
    )
  }
}

export class DuplicatedRequiredPermissionsError extends Error {
  constructor() {
    super(
      'Some required permissions are duplicated. Please remove the duplicates.'
    )
  }
}

export class AllowedMediaHostnameIsEmptyOrInvalidError extends Error {
  constructor() {
    super("The property 'allowedMediaHostnames' is empty or invalid.")
  }
}

export class MissingRequiredPropertiesError extends Error {
  constructor(properties: string[]) {
    const error =
      properties.length === 1
        ? `The required property ${properties[0]} is missing.`
        : `The following required properties ${properties.join(
            ', '
          )} are missing.`
    super(error)
  }
}
