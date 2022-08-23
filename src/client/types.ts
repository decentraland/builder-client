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

export type NFT = {
  tokenId: string
  backgroundColor: string | null
  imageUrl: string
  imagePreviewUrl: string | null
  imageThumbnailUrl: string | null
  imageOriginalUrl: string | null
  name: string | null
  description: string | null
  externalLink: string | null
  owner: NFTAccount
  contract: NFTContract
  traits: NFTTrait[]
  lastSale: NFTSale | null
  sellOrders: NFTOrder[] | null
  orders: NFTOrder[] | null
  topOwnerships: NFTOwnership[] | null
}

export type NFTAccount = {
  user: { username: string } | null
  profileImageUrl: string
  address: string
  config: string
}

export type NFTContract = {
  address: string
  createdDate: string
  name: string
  nftVersion: string | null
  schemaName: string
  symbol: string
  totalSupply: string | null
  description: string
  externalLink: string | null
  imageUrl: string | null
}

export type NFTTrait = {
  type: string
  value: string | number
  displayType: string | null
}

export type NFTSale = {
  eventType: string
  eventTimestamp: string
  totalPrice: string
  quantity: string
  paymentToken: NFTToken
  transaction: NFTTransaction
}

export type NFTOrder = {
  maker: NFTAccount
  currentPrice: string
  paymentTokenContract: NFTToken
}

export type NFTOwnership = {
  owner: NFTAccount
  quantity: string
}

export type NFTToken = {
  id: number
  symbol: string
  address: string
  imageUrl: string
  name: string
  decimals: number
  ethPrice: string
  usdPrice: string
}

export type NFTTransaction = {
  id: number
  fromAccount: NFTAccount
  toAccount: NFTAccount
  transactionHash: string
}

export type GetNFTsParams = {
  owner?: string
  first?: number
  skip?: number
  cursor?: string
}

export type GetNFTsResponse = {
  next: string | null
  previous: string | null
  nfts: NFT[]
}

export type GetNFTParams = {
  contractAddress: string
  tokenId: string
}

export type Redirection = {
  landURL: string
  i18nCouldNotRedirectMsg: string
  i18nClickHereMsg: string
}

export type RedirectionWithContentHash = Redirection & { contentHash: string }

export type UploadLandRedirectionFileParams = Redirection

export type UploadLandRedirectionFileResult = RedirectionWithContentHash

export type GetLandRedirectionContentHashParams = Redirection[]

export type GetLandRedirectionContentHashResult = RedirectionWithContentHash[]

// END - Builder Server NFT
