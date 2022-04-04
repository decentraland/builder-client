import { Rarity } from '@dcl/schemas'
import { Content, RawContent } from '../content/types'
import { BodyShapeType, WearableCategory, ModelMetrics } from '../item/types'

export type WearableRepresentation = {
  bodyShape: BodyShapeType
  mainFile: string
  contents: string[]
  overrideHides?: WearableCategory[]
  overrideReplaces?: WearableCategory[]
  metrics?: ModelMetrics
}

export type AssetJSON = {
  id?: string
  name: string
  urn?: string
  collectionId?: string
  description?: string
  category: WearableCategory
  rarity: Rarity
  hides?: WearableCategory[]
  replaces?: WearableCategory[]
  tags?: string[]
  representations: WearableRepresentation[]
}

export type LoadedFile<T extends Content> = {
  content: RawContent<T>
  asset?: AssetJSON
  mainModel?: string
}
