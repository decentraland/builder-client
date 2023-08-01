import { RequiredPermission } from '@dcl/schemas'
import {
  AllowedMediaHostnameIsEmptyOrInvalidError,
  DuplicatedRequiredPermissionsError,
  InvalidSceneConfigFileError,
  MissingRequiredPropertiesError,
  UnknownRequiredPermissionsError
} from './files.errors'
import { SceneConfig, AjvError, ErrorHandlerBySceneProperty } from './types'

function requiredPermissionsErrorHandler(
  error: AjvError,
  errors: AjvError[],
  sceneConfig: SceneConfig
) {
  switch (error.keyword) {
    case 'enum': {
      const requiredPermissions =
        sceneConfig.requiredPermissions as RequiredPermission[]
      const wrongPermissions = errors
        .flatMap(({ instancePath }) => instancePath.split('/').slice(-1))
        .map((i) => requiredPermissions[i])

      throw new UnknownRequiredPermissionsError(wrongPermissions)
    }

    case 'uniqueItems':
      throw new DuplicatedRequiredPermissionsError()
  }
}

function allowedMediaHostnamesErrorHandler(error: AjvError) {
  const { keyword, params } = error
  // When the allowedMediaHostnames is null or an empty array, the property is missing.
  if ((keyword === 'type' && params.type === 'array') || keyword === 'minItems')
    throw new AllowedMediaHostnameIsEmptyOrInvalidError()
}

const propertyHandlers: ErrorHandlerBySceneProperty = {
  requiredPermissions: requiredPermissionsErrorHandler,
  allowedMediaHostnames: allowedMediaHostnamesErrorHandler
}

const handleAjvError = (
  error: AjvError,
  errors: AjvError[],
  sceneConfig: SceneConfig
) => {
  const { instancePath, keyword } = error

  if (!instancePath) {
    switch (keyword) {
      case 'required': {
        const missingProperties = errors
          .filter(({ keyword }) => keyword === 'required')
          .map(({ params }) => params.missingProperty as string)
        throw new MissingRequiredPropertiesError(missingProperties)
      }
      default:
        return
    }
  }

  const [property] = instancePath.split('/').slice(1)

  if (!property || !(property in propertyHandlers)) return

  propertyHandlers[property](error, errors, sceneConfig)
}

export function handleAjvErrors(
  sceneConfig: SceneConfig,
  errors?: AjvError[] | null
) {
  errors?.forEach((error) => handleAjvError(error, errors, sceneConfig))
  throw new InvalidSceneConfigFileError(errors)
}
