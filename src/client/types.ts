import { ItemRarity, ItemType, ModelMetrics, WearableData } from '../item/types'

export type ServerResponse = {
  data: any
  ok: boolean
  error?: string
}

export type RemoteItem = {
  id: string // uuid
  name: string
  description: string
  thumbnail: string
  eth_address: string
  collection_id: string | null
  blockchain_item_id: string | null
  total_supply: number | null
  price: string | null
  urn: string | null
  beneficiary: string | null
  rarity: ItemRarity | null
  type: ItemType
  data: WearableData
  metrics: ModelMetrics
  contents: Record<string, string>
  content_hash: string | null
  is_published: boolean
  is_approved: boolean
  in_catalyst: boolean
  created_at: number
  updated_at: number
}

export type UpsertableRemoteItem = Omit<
  RemoteItem,
  | 'is_published'
  | 'is_approved'
  | 'in_catalyst'
  | 'created_at'
  | 'updated_at'
  | 'total_supply'
>
