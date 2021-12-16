import { ItemRarity, WearableBodyShape, WearableCategory } from '../item/types'

export type AssetJSON = {
  name: string
  description: string
  category: WearableCategory
  rarity: ItemRarity
  thumbnail: string
  representations: {
    bodyShape: WearableBodyShape
    files: string[]
    modelPath: string
  }[]
}
