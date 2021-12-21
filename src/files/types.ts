import { Rarity } from '@dcl/schemas'
import { WearableBodyShape, WearableCategory } from '../item/types'

export type AssetJSON = {
  name: string
  description: string
  category: WearableCategory
  rarity: Rarity
  thumbnail: string
  representations: {
    bodyShape: WearableBodyShape
    files: string[]
    modelPath: string
  }[]
}
