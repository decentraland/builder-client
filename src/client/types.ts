export type ServerResponse<T> = {
  data: T
  ok: boolean
  error?: string
}

export enum ThirdPartyMetadataType {
  THIRD_PARTY_V1 = 'third_party_v1'
}

export type ThirdPartyMetadata = {
  type: ThirdPartyMetadataType
  thirdParty: { name: string; description: string } | null
}

export type ThirdParty = {
  id: string
  root: string
  name: string
  description: string
  managers: string[]
  maxItems: string
  totalItems: string
}

// START - Builder Server NFT
// TODO: Abstract these types someplace else to avoid repetition

// NFT Entity
export type NFT = {
  tokenId: string
  imageUrl: string
  name: string
  description: string
  contract: { address: string; name: string }
}

// Service types
export type GetNFTsParams = {
  owner?: string
  first?: number
  skip?: number
  cursor?: string
  network?: string
}

export type GetNFTsResponse = {
  next: string | null
  previous: string | null
  nfts: NFT[]
}

export type GetNFTParams = {
  contractAddress: string
  tokenId: string
  network?: string
}

// END - Builder Server NFT

// START - Builder Server LAND

export type LandCoords = {
  x: number
  y: number
}

export type LandHashes = {
  ipfsHash: string
  contentHash: string
}

// END - Builder Server LAND
