type BaseItem = {
  id: string // uuid
  name: string
  thumbnail: string
  description: string
  rarity?: ItemRarity
  metrics: ModelMetrics
}

export type Item = BaseItem & {
  type: ItemType
  owner: string
  collectionId?: string
  tokenId?: string
  price?: string
  urn?: string
  beneficiary?: string
  contents: Record<string, string>
  contentHash: string | null
  data: WearableData
}

// Should this be called full item or ResponseItem?
export type FullItem = Item & {
  isPublished: boolean
  isApproved: boolean
  inCatalyst: boolean
  createdAt: number
  updatedAt: number
  totalSupply?: number
}

export enum ItemType {
  WEARABLE = 'wearable'
}

export enum ItemRarity {
  UNIQUE = 'unique',
  MYTHIC = 'mythic',
  LEGENDARY = 'legendary',
  EPIC = 'epic',
  RARE = 'rare',
  UNCOMMON = 'uncommon',
  COMMON = 'common'
}

export enum WearableCategory {
  EARRING = 'earring',
  EYEWEAR = 'eyewear',
  EYEBROWS = 'eyebrows',
  EYES = 'eyes',
  FACIAL_HAIR = 'facial_hair',
  FEET = 'feet',
  HAIR = 'hair',
  HAT = 'hat',
  HEAD = 'head',
  HELMET = 'helmet',
  LOWER_BODY = 'lower_body',
  MASK = 'mask',
  MOUTH = 'mouth',
  UPPER_BODY = 'upper_body',
  TIARA = 'tiara',
  TOP_HEAD = 'top_head'
}

export enum BodyShapeType {
  BOTH = 'both',
  MALE = 'male',
  FEMALE = 'female'
}

export enum WearableBodyShape {
  MALE = 'urn:decentraland:off-chain:base-avatars:BaseMale',
  FEMALE = 'urn:decentraland:off-chain:base-avatars:BaseFemale'
}

export enum WearableBodyShapeType {
  MALE = 'BaseMale',
  FEMALE = 'BaseFemale'
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
  replaces: WearableCategory[]
  hides: WearableCategory[]
  tags: string[]
}

export type WearableRepresentation = {
  bodyShapes: WearableBodyShape[]
  mainFile: string
  contents: string[]
  overrideReplaces: WearableCategory[]
  overrideHides: WearableCategory[]
}
