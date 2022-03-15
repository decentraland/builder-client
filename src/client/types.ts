export type ServerResponse<T> = {
  data: T
  ok: boolean
  error?: string
}

/**
 * NFT types required by the client
 * They have been copied from the builder server.
 * TODO: Find a way to abstract these types someplace else to avoid this nasty repetition
 */

export type NFT = {
  tokenId: string
  name: string
  thumbnail: string
  contract: {
    name: string
    address: string
  }
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
