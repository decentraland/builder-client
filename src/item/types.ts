import {
  Rarity,
  WearableCategory,
  WearableRepresentation,
  BodyShape as WearableBodyShape,
  HideableWearableCategory
} from '@dcl/schemas'

import { Content, RawContent } from '../content/types'

export type RemoteItem = {
  id: string // uuid
  name: string
  description: string | null
  thumbnail: string
  eth_address: string
  collection_id: string | null
  blockchain_item_id: string | null
  total_supply: number | null
  price: string | null
  urn: string | null
  beneficiary: string | null
  rarity: Rarity | null
  type: ItemType
  data: WearableData
  metrics: ModelMetrics
  contents: Record<string, string>
  content_hash: string | null
  local_content_hash: string | null
  catalyst_content_hash: string | null
  is_published: boolean
  is_approved: boolean
  in_catalyst: boolean
  created_at: number
  updated_at: number
}

export type LocalItem = Omit<
  RemoteItem,
  | 'is_published'
  | 'is_approved'
  | 'in_catalyst'
  | 'created_at'
  | 'updated_at'
  | 'total_supply'
  | 'blockchain_item_id'
  | 'eth_address'
  | 'price'
  | 'beneficiary'
  | 'local_content_hash'
  | 'catalyst_content_hash'
>

export type BasicItem = Pick<LocalItem, 'name' | 'rarity'> &
  Partial<Pick<LocalItem, 'description' | 'collection_id' | 'urn' | 'id'>> &
  Pick<WearableData, 'category'>

export enum ItemType {
  WEARABLE = 'wearable'
}

export type ModelMetrics = {
  triangles: number
  materials: number
  meshes: number
  bodies: number
  entities: number
  textures: number
}

export type WearableData = {
  category?: WearableCategory
  representations: WearableRepresentation[]
  replaces: HideableWearableCategory[]
  hides: HideableWearableCategory[]
  tags: string[]
  blockVrmExport?: boolean
}

export type BuiltItem<T extends Content> = {
  item: LocalItem
  newContent: RawContent<T>
}

export { Rarity, WearableCategory, WearableBodyShape }
