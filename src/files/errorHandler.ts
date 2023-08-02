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
  const requiredPermissions =
    sceneConfig.requiredPermissions as RequiredPermission[]

  const isRequiredPermissionsError = (err: AjvError) =>
    getPropertyWithError(err) === 'requiredPermissions'

  switch (error.keyword) {
    case 'enum': {
      const wrongPermissions = errors
        .filter(
          (err) => err.keyword === 'enum' && isRequiredPermissionsError(err)
        )
        .flatMap(({ instancePath }) => instancePath.split('/').slice(-1))
        .map((i) => requiredPermissions[i])

      throw new UnknownRequiredPermissionsError(wrongPermissions)
    }

    case 'uniqueItems': {
      const duplicatedRequiredPermissions = errors
        .filter(
          (err) =>
            err.keyword === 'uniqueItems' && isRequiredPermissionsError(err)
        )
        .flatMap(({ params: { i } }) => requiredPermissions[i as number])

      throw new DuplicatedRequiredPermissionsError(
        duplicatedRequiredPermissions
      )
    }
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

const getPropertyWithError = ({ instancePath }: AjvError) => {
  const [property] = instancePath.split('/').slice(1)
  return property
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

  const property = getPropertyWithError(error)
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
