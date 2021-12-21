import { Rarity, WearableRepresentation } from '@dcl/schemas'
import { WearableCategory } from '../item/types'

export type AssetJSON = {
  name: string
  description?: string
  category: WearableCategory
  rarity: Rarity
  thumbnail: string
  representations: WearableRepresentation[]
}
