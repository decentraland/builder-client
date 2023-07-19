import {
  HideableWearableCategory,
  JSONSchema,
  Scene,
  WearableRepresentation
} from '@dcl/schemas'
import { WearableCategory, Rarity } from '../item/types'
import { BuilderConfig, SceneConfig, WearableConfig } from './types'

export const BuilderConfigSchema: JSONSchema<BuilderConfig> = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      nullable: true
    },
    collectionId: {
      type: 'string',
      nullable: true
    }
  },
  additionalProperties: false,
  required: []
}

export const WearableConfigSchema: JSONSchema<WearableConfig> = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      nullable: true
    },
    description: {
      type: 'string',
      nullable: true
    },
    rarity: {
      ...Rarity.schema,
      nullable: true
    },
    name: {
      type: 'string'
    },
    data: {
      type: 'object',
      properties: {
        replaces: {
          type: 'array',
          items: HideableWearableCategory.schema
        },
        hides: {
          type: 'array',
          items: HideableWearableCategory.schema
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          }
        },
        representations: {
          type: 'array',
          items: WearableRepresentation.schema,
          minItems: 1
        },
        category: WearableCategory.schema
      },
      required: ['replaces', 'hides', 'tags', 'representations', 'category']
    }
  },
  additionalProperties: false,
  required: ['name', 'data']
}

export const SceneConfigSchema: JSONSchema<SceneConfig> = Scene.schema
