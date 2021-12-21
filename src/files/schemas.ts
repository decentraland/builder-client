import { Rarity, WearableRepresentation } from '@dcl/schemas'

export const AssetJSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    rarity: Rarity.schema,
    thumbnail: { type: 'string' },
    representations: { type: 'array', items: WearableRepresentation.schema }
  },
  required: ['name', 'rarity', 'thumbnail', 'representations'],
  additionalProperties: false
}
