import {
  EmoteCategory,
  EmotePlayMode,
  HideableWearableCategory,
  JSONSchema,
  Scene,
  WearableRepresentation
} from '@dcl/schemas'
import { WearableCategory, Rarity } from '../item/types'
import {
  BuilderConfig,
  EmoteConfig,
  SceneConfig,
  WearableConfig
} from './types'

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
      nullable: true,
      maxLength: 64
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
        category: WearableCategory.schema,
        removesDefaultHiding: {
          type: 'array',
          nullable: true,
          items: HideableWearableCategory.schema
        }
      },
      required: ['replaces', 'hides', 'tags', 'representations', 'category']
    }
  },
  additionalProperties: false,
  required: ['name', 'data']
}

export const SceneConfigSchema: JSONSchema<SceneConfig> = Scene.schema

export const EmoteConfigSchema: JSONSchema<EmoteConfig> = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      nullable: true
    },
    description: {
      type: 'string',
      nullable: true,
      maxLength: 64
    },
    rarity: {
      ...Rarity.schema,
      nullable: true
    },
    category: {
      ...EmoteCategory.schema,
      nullable: true
    },
    play_mode: {
      ...EmotePlayMode.schema,
      nullable: true
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1
      },
      nullable: true
    }
  },
  additionalProperties: true,
  required: []
}
