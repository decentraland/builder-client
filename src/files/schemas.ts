import { BodyShapeType, WearableCategory, Rarity } from '../item/types'

const WearableRepresentationSchema = {
  type: 'object',
  properties: {
    bodyShape: {
      type: 'string',
      enum: Object.values(BodyShapeType)
    },
    mainFile: {
      type: 'string'
    },
    contents: {
      type: 'array',
      items: { type: 'string' }
    },
    overrideHides: {
      type: 'array',
      items: WearableCategory.schema
    },
    overrideReplaces: {
      type: 'array',
      items: WearableCategory.schema
    }
  },
  required: ['bodyShape', 'mainFile', 'contents'],
  additionalProperties: false
}

export const AssetJSONSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    collectionId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string' },
    urn: { type: 'string' },
    rarity: Rarity.schema,
    category: WearableCategory.schema,
    hides: {
      type: 'array',
      items: WearableCategory.schema
    },
    replaces: {
      type: 'array',
      items: WearableCategory.schema
    },
    tags: { type: 'array', items: { type: 'string' } },
    representations: { type: 'array', items: WearableRepresentationSchema }
  },
  required: ['id', 'name', 'rarity', 'category', 'representations'],
  additionalProperties: false
}
