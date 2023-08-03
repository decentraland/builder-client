import { RequiredPermission } from '@dcl/schemas'
import { handleAjvErrors } from './errorHandler'
import {
  AllowedMediaHostnameIsEmptyOrInvalidError,
  DuplicatedRequiredPermissionsError,
  InvalidSceneConfigFileError,
  MissingRequiredPropertiesError,
  UnknownRequiredPermissionsError
} from './files.errors'
import { AjvError, SceneConfig } from './types'

describe('when handling the errors detected by ajv in the scene file', () => {
  let sceneConfig: SceneConfig
  let errors: AjvError[]

  beforeEach(() => {
    sceneConfig = {
      scene: {
        parcels: ['0,0', '0,1', '1,0', '1,1'],
        base: '0,0'
      },
      main: 'game.js'
    }
  })

  describe('and there are no errors in the validation array', () => {
    it('should throw InvalidSceneConfigFile error', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        InvalidSceneConfigFileError
      )
    })
  })

  describe('and none of the errors are specially handled', () => {
    beforeEach(() => {
      errors = [
        {
          keyword: 'type',
          instancePath: '/scene',
          schemaPath: '#/properties/scene/type',
          params: { type: 'object' },
          message: 'should be object'
        }
      ]
    })

    it('should throw InvalidSceneConfigFile error', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        InvalidSceneConfigFileError
      )
    })
  })

  describe('and one of the errors mentions that there are duplicated required permissions', () => {
    beforeEach(() => {
      sceneConfig = {
        ...sceneConfig,
        requiredPermissions: [
          RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE,
          RequiredPermission.OPEN_EXTERNAL_LINK,
          RequiredPermission.OPEN_EXTERNAL_LINK
        ] as unknown as RequiredPermission[]
      }

      errors = [
        {
          instancePath: '/requiredPermissions',
          keyword: 'uniqueItems',
          message:
            'must NOT have duplicate items (items ## 2 and 1 are identical)',
          params: { i: 1, j: 2 },
          schemaPath: '#/properties/requiredPermissions/uniqueItems'
        }
      ]
    })

    it('should throw DuplicatedRequiredPermissions error', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        new DuplicatedRequiredPermissionsError([
          RequiredPermission.OPEN_EXTERNAL_LINK
        ])
      )
    })
  })

  describe('and more than one of the errors mention that there are duplicated required permissions', () => {
    beforeEach(() => {
      sceneConfig = {
        ...sceneConfig,
        requiredPermissions: [
          RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE,
          RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE,
          RequiredPermission.OPEN_EXTERNAL_LINK,
          RequiredPermission.OPEN_EXTERNAL_LINK
        ] as unknown as RequiredPermission[]
      }

      errors = [
        {
          instancePath: '/requiredPermissions',
          keyword: 'uniqueItems',
          message:
            'must NOT have duplicate items (items ## 1 and 0 are identical)',
          params: { i: 0, j: 1 },
          schemaPath: '#/properties/requiredPermissions/uniqueItems'
        },
        {
          instancePath: '/requiredPermissions',
          keyword: 'uniqueItems',
          message:
            'must NOT have duplicate items (items ## 3 and 2 are identical)',
          params: { i: 2, j: 3 },
          schemaPath: '#/properties/requiredPermissions/uniqueItems'
        }
      ]
    })

    it('should throw DuplicatedRequiredPermissions error', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        new DuplicatedRequiredPermissionsError([
          RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE,
          RequiredPermission.OPEN_EXTERNAL_LINK
        ])
      )
    })
  })

  describe('and one of the errors mentions that one of the permissions is not correct', () => {
    beforeEach(() => {
      sceneConfig = {
        ...sceneConfig,
        requiredPermissions: [
          RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE,
          'wrong1',
          'wrong2',
          RequiredPermission.OPEN_EXTERNAL_LINK,
          'wrong3'
        ] as unknown as RequiredPermission[]
      }

      errors = [
        {
          instancePath: '/requiredPermissions/1',
          keyword: 'enum',
          message: 'must be equal to one of the allowed values',
          params: {},
          schemaPath: '#/properties/requiredPermissions/items/enum'
        },
        {
          instancePath: '/requiredPermissions/2',
          keyword: 'enum',
          message: 'must be equal to one of the allowed values',
          params: {},
          schemaPath: '#/properties/requiredPermissions/items/enum'
        },
        {
          instancePath: '/requiredPermissions/4',
          keyword: 'enum',
          message: 'must be equal to one of the allowed values',
          params: {},
          schemaPath: '#/properties/requiredPermissions/items/enum'
        },
        {
          instancePath: '/allowedMediaHostnames',
          keyword: 'type',
          params: { type: 'array' },
          schemaPath: '#/properties/allowedMediaHostnames/type'
        }
      ]
    })

    it('should throw UnknownRequiredPermissionsError grouping all wrong permissions', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        new UnknownRequiredPermissionsError(['wrong1', 'wrong2', 'wrong3'])
      )
    })
  })

  describe.each([
    [
      'is not an array (it could be null in these cases)',
      {
        instancePath: '/allowedMediaHostnames',
        keyword: 'type',
        params: { type: 'array' },
        schemaPath: '#/properties/allowedMediaHostnames/type'
      }
    ],
    [
      'is an empty array',
      {
        instancePath: '/allowedMediaHostnames',
        keyword: 'minItems',
        params: { limit: 1 },
        schemaPath: '#/properties/allowedMediaHostnames/minItems'
      }
    ]
  ])(
    'and one of the errors mentions that the allowedMediaHostname prop %s',
    (_, error) => {
      beforeEach(() => {
        errors = [error]
      })

      it('should throw MissingRequiredPropertyError error', () => {
        expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
          new AllowedMediaHostnameIsEmptyOrInvalidError()
        )
      })
    }
  )

  describe('and one of the errors mentions that the allowedMediaHostname prop is missing', () => {
    beforeEach(() => {
      errors = [
        {
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'allowedMediaHostnames' },
          schemaPath: '#/properties/allowedMediaHostnames/required'
        }
      ]
    })

    it('should throw MissingRequiredPropertyError error', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        new MissingRequiredPropertiesError(['allowedMediaHostnames'])
      )
    })
  })

  describe('and one of the errors mentions that there are some missing required properties', () => {
    beforeEach(() => {
      errors = [
        {
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'allowedMediaHostnames' },
          schemaPath: '#/properties/allowedMediaHostnames/required'
        },
        {
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'main' },
          schemaPath: '#/properties/main/required'
        },
        {
          instancePath: '',
          keyword: 'required',
          params: { missingProperty: 'scene' },
          schemaPath: '#/properties/scene/required'
        }
      ]
    })

    it('should throw MissingRequiredPropertyError error grouping all the missing properties', () => {
      expect(() => handleAjvErrors(sceneConfig, errors)).toThrow(
        new MissingRequiredPropertiesError([
          'allowedMediaHostnames',
          'main',
          'scene'
        ])
      )
    })
  })
})
