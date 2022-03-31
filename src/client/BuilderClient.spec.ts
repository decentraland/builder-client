import { ethers } from 'ethers'
import nock from 'nock'
import { RawContent } from '../content/types'
import {
  ItemType,
  LocalItem,
  RemoteItem,
  WearableCategory
} from '../item/types'
import { fakePrivateKey } from '../test-utils/crypto'
import { BuilderClient } from './BuilderClient'
import { ClientError } from './BuilderClient.errors'
import { createIdentity } from './identity'
import {
  addressRegex,
  publicKeyRegex,
  secondHeaderPayloadRegex
} from './matchers'
import { GetNFTParams, GetNFTsResponse, NFT, ServerResponse } from './types'

nock.disableNetConnect()

const testUrl = 'http://test-url'
const address = 'anAddress'
let item: LocalItem
let remoteItem: RemoteItem
let client: BuilderClient

const FIRST_AUTH_HEADER = 'x-identity-auth-chain-0'
const SECOND_AUTH_HEADER = 'x-identity-auth-chain-1'
const THIRD_AUTH_HEADER = 'x-identity-auth-chain-2'

const firstHeaderValueMatcher = (value: string) => {
  const parsedValue = JSON.parse(value)
  return (
    parsedValue.type === 'SIGNER' &&
    addressRegex.test(parsedValue.payload) &&
    parsedValue.signature === ''
  )
}

const secondHeaderValueMatcher = (value: string) => {
  const parsedValue = JSON.parse(value)
  return (
    parsedValue.type === 'ECDSA_EPHEMERAL' &&
    secondHeaderPayloadRegex.test(parsedValue.payload) &&
    publicKeyRegex.test(parsedValue.signature)
  )
}

const thirdHeaderValueMatcher =
  (method: string, url: string) => (value: string) => {
    const parsedValue = JSON.parse(value)
    return (
      parsedValue.type === 'ECDSA_SIGNED_ENTITY' &&
      parsedValue.payload ===
        `${method.toLowerCase()}:${url.toLocaleLowerCase()}` &&
      publicKeyRegex.test(parsedValue.signature)
    )
  }

let mockNFT: NFT

beforeEach(async () => {
  const wallet = new ethers.Wallet(fakePrivateKey)
  const identity = await createIdentity(wallet, 1000)
  const date = Date.now()
  client = new BuilderClient(testUrl, identity, address)

  item = {
    id: 'anId',
    name: 'aName',
    description: 'aDescription',
    collection_id: null,
    urn: null,
    rarity: null,
    type: ItemType.WEARABLE,
    thumbnail: 'aThumbnail',
    metrics: {
      triangles: 0,
      materials: 0,
      meshes: 0,
      bodies: 0,
      entities: 0,
      textures: 0
    },
    contents: {
      aFileContent: 'QmaX5DcQkjtgfQK3foNhZLYVbUzVAU6m5Gh1GtjT4f6G3i'
    },
    data: {
      category: WearableCategory.EYEBROWS,
      representations: [],
      replaces: [],
      hides: [],
      tags: []
    },
    content_hash: 'aContentHash'
  }
  remoteItem = {
    ...item,
    is_published: false,
    is_approved: false,
    in_catalyst: false,
    created_at: date,
    updated_at: date,
    blockchain_item_id: null,
    price: null,
    eth_address: '0x00',
    beneficiary: null,
    total_supply: 1000,
    local_content_hash: 'someHash',
    catalyst_content_hash: 'someOtherHash'
  }

  mockNFT = {
    backgroundColor: 'background_color',
    contract: {
      address: 'address',
      createdDate: 'created_date',
      name: 'name',
      nftVersion: 'nft_version',
      schemaName: 'schema_name',
      symbol: 'symbol',
      totalSupply: 'total_supply',
      description: 'description',
      externalLink: 'external_link',
      imageUrl: 'image_url'
    },
    description: 'description',
    externalLink: 'external_link',
    imageOriginalUrl: 'image_original_url',
    imagePreviewUrl: 'image_preview_url',
    imageThumbnailUrl: 'image_thumbnail_url',
    imageUrl: 'image_url',
    lastSale: {
      eventType: 'event_type',
      eventTimestamp: 'event_timestamp',
      totalPrice: 'total_price',
      quantity: 'quantity',
      paymentToken: {
        id: 100,
        symbol: 'symbol',
        address: 'address',
        imageUrl: 'image_url',
        name: 'name',
        decimals: 18,
        ethPrice: 'eth_price',
        usdPrice: 'usd_price'
      },
      transaction: {
        id: 100,
        fromAccount: {
          address: 'address',
          config: 'config',
          profileImageUrl: 'profile_img_url',
          user: {
            username: 'username'
          }
        },
        toAccount: {
          address: 'address',
          config: 'config',
          profileImageUrl: 'profile_img_url',
          user: {
            username: 'username'
          }
        },
        transactionHash: 'transaction_hash'
      }
    },
    name: 'name',
    orders: [
      {
        maker: {
          address: 'address',
          config: 'config',
          profileImageUrl: 'profile_img_url',
          user: {
            username: 'username'
          }
        },
        currentPrice: 'current_price',
        paymentTokenContract: {
          id: 100,
          symbol: 'symbol',
          address: 'address',
          imageUrl: 'image_url',
          name: 'name',
          decimals: 18,
          ethPrice: 'eth_price',
          usdPrice: 'usd_price'
        }
      }
    ],
    owner: {
      address: 'address',
      config: 'config',
      profileImageUrl: 'profile_img_url',
      user: {
        username: 'username'
      }
    },
    sellOrders: [
      {
        maker: {
          address: 'address',
          config: 'config',
          profileImageUrl: 'profile_img_url',
          user: {
            username: 'username'
          }
        },
        currentPrice: 'current_price',
        paymentTokenContract: {
          id: 100,
          symbol: 'symbol',
          address: 'address',
          imageUrl: 'image_url',
          name: 'name',
          decimals: 18,
          ethPrice: 'eth_price',
          usdPrice: 'usd_price'
        }
      }
    ],
    tokenId: 'token_id',
    topOwnerships: [
      {
        owner: {
          address: 'address',
          config: 'config',
          profileImageUrl: 'profile_img_url',
          user: {
            username: 'username'
          }
        },
        quantity: 'quantity'
      }
    ],
    traits: [
      {
        displayType: 'display_type',
        type: 'trait_type',
        value: 'value'
      }
    ]
  }
})

afterEach(() => {
  nock.cleanAll()
})

describe('when upserting an item', () => {
  describe('and the request to insert/update the item fails', () => {
    let errorData: {
      id: string
      contractAddress: string
    }
    let errorMessage: string

    beforeEach(async () => {
      errorMessage =
        "The collection that contains this item has been already published. The item can't be updated."
      errorData = {
        id: item.id,
        contractAddress: 'aContractAddress'
      }
    })

    describe('and the failure is represented with an ok as false and a 200 status code', () => {
      beforeEach(() => {
        nock(testUrl)
          .put(`/v1/items/${item.id}`, {
            item: { ...item, eth_address: address }
          })
          .reply(200, {
            error: errorMessage,
            data: errorData,
            ok: false
          })
      })

      it("should throw a client error with the server's error message and data", () => {
        return expect(client.upsertItem(item, {})).rejects.toThrow(
          new ClientError(errorMessage, 200, errorData)
        )
      })
    })

    describe('and the failure is represented with an errored status code', () => {
      beforeEach(() => {
        nock(testUrl)
          .put(`/v1/items/${item.id}`, {
            item: { ...item, eth_address: address }
          })
          .reply(409, {
            error: errorMessage,
            data: errorData,
            ok: false
          })
      })

      it("should throw a client error with the server's error message and data", () => {
        return expect(client.upsertItem(item, {})).rejects.toThrow(
          new ClientError(errorMessage, 409, errorData)
        )
      })
    })
  })

  describe('and the request to upload the item files fails', () => {
    const errorMessage = 'An error occurred trying to upload item files'
    let errorData: Record<string, unknown>
    let content: RawContent<Uint8Array>

    beforeEach(() => {
      nock(testUrl).put(`/v1/items/${item.id}`).reply(200, {
        data: item,
        ok: true
      })
      errorData = {}
      content = {
        aFileContent: Buffer.from('someContent')
      }
    })

    describe('and the failure is represented with an ok as false and a 200 status code', () => {
      beforeEach(() => {
        nock(testUrl).post(`/v1/items/${item.id}/files`).reply(200, {
          error: errorMessage,
          data: errorData,
          ok: false
        })
      })

      it("should throw a client error with the server's error message and data", () => {
        return expect(client.upsertItem(item, content)).rejects.toThrow(
          new ClientError(errorMessage, 200, errorData)
        )
      })
    })

    describe('and the failure is represented with an errored status code', () => {
      beforeEach(() => {
        nock(testUrl).post(`/v1/items/${item.id}/files`).reply(500, {
          error: errorMessage,
          data: errorData,
          ok: false
        })
      })

      it("should throw a client error with the server's error message and data", () => {
        return expect(client.upsertItem(item, content)).rejects.toThrow(
          new ClientError(errorMessage, 500, errorData)
        )
      })
    })
  })

  describe('and the request to insert/update the item succeeds', () => {
    let nockedUpsert: nock.Scope
    let nockedFileUpload: nock.Scope
    let result: RemoteItem

    beforeEach(() => {
      nockedUpsert = nock(testUrl)
        .put(`/v1/items/${item.id}`, {
          item: { ...item, eth_address: address }
        })
        .matchHeader(FIRST_AUTH_HEADER, firstHeaderValueMatcher)
        .matchHeader(SECOND_AUTH_HEADER, secondHeaderValueMatcher)
        .matchHeader(
          THIRD_AUTH_HEADER,
          thirdHeaderValueMatcher('put', `/items/${item.id}`)
        )
        .matchHeader('content-type', 'application/json')
        .reply(200, {
          data: remoteItem,
          ok: true
        })
      nockedFileUpload = nock(testUrl)
        .post(
          `/v1/items/${item.id}/files`,
          /form-data; name="QmaX5DcQkjtgfQK3foNhZLYVbUzVAU6m5Gh1GtjT4f6G3i"[^]*someContent\r\n/m
        )
        .matchHeader('content-type', /^multipart\/form-data;.+/)
        .reply(200, {
          data: {},
          ok: true
        })
    })

    describe('and the builder client is constructed with a function to get the identity and the address', () => {
      beforeEach(async () => {
        const wallet = new ethers.Wallet(fakePrivateKey)
        const identity = await createIdentity(wallet, 1000)
        client = new BuilderClient(
          testUrl,
          () => identity,
          () => address
        )
      })

      describe('and there are no item contents to update', () => {
        beforeEach(async () => {
          result = await client.upsertItem(item, {})
        })

        it('should have performed the request to insert/update the item with the given item', () => {
          expect(nockedUpsert.isDone()).toBe(true)
        })

        it('should not have performed the request to upload the item files', () => {
          expect(nockedFileUpload.isDone()).toBe(false)
        })

        it('should have returned the full item', () => {
          expect(result).toEqual(remoteItem)
        })
      })

      describe('and there are item contents to update', () => {
        beforeEach(async () => {
          result = await client.upsertItem(item, {
            aFileContent: Buffer.from('someContent')
          })
        })

        it('should have performed the request to insert/update the item with the given item', () => {
          expect(nockedUpsert.isDone()).toBe(true)
        })

        it('should have performed the request to upload the item files', () => {
          expect(nockedFileUpload.isDone()).toBe(true)
        })

        it('should have returned the full item', () => {
          expect(result).toEqual(remoteItem)
        })
      })
    })

    describe('and the builder client is constructed with a constant for the identity and the address', () => {
      beforeEach(async () => {
        const wallet = new ethers.Wallet(fakePrivateKey)
        const identity = await createIdentity(wallet, 1000)
        client = new BuilderClient(testUrl, identity, address)
      })

      describe('and there are no item contents to update', () => {
        beforeEach(async () => {
          result = await client.upsertItem(item, {})
        })

        it('should have performed the request to insert/update the item with the given item', () => {
          expect(nockedUpsert.isDone()).toBe(true)
        })

        it('should not have performed the request to upload the item files', () => {
          expect(nockedFileUpload.isDone()).toBe(false)
        })

        it('should have returned the full item', () => {
          expect(result).toEqual(remoteItem)
        })
      })

      describe('and there are item contents to update', () => {
        beforeEach(async () => {
          result = await client.upsertItem(item, {
            aFileContent: Buffer.from('someContent')
          })
        })

        it('should have performed the request to insert/update the item with the given item', () => {
          expect(nockedUpsert.isDone()).toBe(true)
        })

        it('should have performed the request to upload the item files', () => {
          expect(nockedFileUpload.isDone()).toBe(true)
        })

        it('should have returned the full item', () => {
          expect(result).toEqual(remoteItem)
        })
      })
    })
  })
})

describe('when getting the size of a content', () => {
  const contentId = 'aFileId'
  let nockInterceptor: nock.Interceptor
  beforeEach(() => {
    nockInterceptor = nock(testUrl).head(`/v1/storage/contents/${contentId}`)
  })

  describe('and the request fails with an errored status code', () => {
    let errorData: {
      id: string
    }
    let errorMessage: string

    beforeEach(() => {
      errorData = {
        id: contentId
      }
      errorMessage = 'An error occurred trying to get the size of a content'
      nockInterceptor.reply(500, {
        ok: false,
        error: errorMessage,
        data: errorData
      })
    })

    it("should throw a client error with the server's error message and data", () => {
      return expect(client.getContentSize(contentId)).rejects.toThrow(
        new ClientError(errorMessage, 500, errorData)
      )
    })
  })

  describe('and the request succeeds', () => {
    const contentLength = '123'

    beforeEach(() => {
      nockInterceptor.reply(200, undefined, { 'Content-Length': contentLength })
    })

    it('should have returned the size of the content', () => {
      return expect(client.getContentSize(contentId)).resolves.toBe(
        Number(contentLength)
      )
    })
  })
})

describe('when getting a list of nfts', () => {
  let response: ServerResponse<GetNFTsResponse>

  beforeEach(() => {
    response = {
      ok: true,
      data: {
        next: 'next',
        previous: 'previous',
        nfts: [mockNFT]
      }
    }
  })

  it("should return the data of the request's response", async () => {
    nock(testUrl).get('/v1/nfts').reply(200, response)
    const nfts = await client.getNFTs()
    expect(nfts).toEqual(response.data)
  })

  describe('when owner is provided', () => {
    it('should add owner query param to the request url', async () => {
      nock(testUrl).get('/v1/nfts?owner=owner').reply(200, response)
      const nfts = await client.getNFTs({ owner: 'owner' })
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when first is provided', () => {
    it('should add first query param to the request url', async () => {
      nock(testUrl).get('/v1/nfts?first=1').reply(200, response)
      const nfts = await client.getNFTs({ first: 1 })
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when skip is provided', () => {
    it('should add skip query param to the request url', async () => {
      nock(testUrl).get('/v1/nfts?skip=1').reply(200, response)
      const nfts = await client.getNFTs({ skip: 1 })
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when cursor is provided', () => {
    it('should add cursor query param to the request url', async () => {
      nock(testUrl).get('/v1/nfts?cursor=cursor').reply(200, response)
      const nfts = await client.getNFTs({ cursor: 'cursor' })
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when all params are provided', () => {
    it('should add all query params to the request url', async () => {
      nock(testUrl)
        .get('/v1/nfts?owner=owner&first=1&skip=1&cursor=cursor')
        .reply(200, response)
      const nfts = await client.getNFTs({
        owner: 'owner',
        first: 1,
        skip: 1,
        cursor: 'cursor'
      })
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when no params are provided', () => {
    it('should add no query params at all', async () => {
      nock(testUrl).get('/v1/nfts').reply(200, response)
      const nfts = await client.getNFTs()
      expect(nfts).toEqual(response.data)
    })
  })

  describe('when the request fails without a response', () => {
    it('should throw a client error with the message of the error', async () => {
      await expect(client.getNFTs()).rejects.toEqual(
        new ClientError(
          'request to http://test-url/v1/nfts failed, reason: Nock: Disallowed net connect for "test-url:80/v1/nfts"',
          undefined,
          null
        )
      )
    })
  })

  describe('when the fetch fails with a response', () => {
    describe('when the fetch response is not ok', () => {
      it('should throw a client error', async () => {
        nock(testUrl).get('/v1/nfts').reply(500, response)
        await expect(client.getNFTs()).rejects.toEqual(
          new ClientError('Unknown error', 500, null)
        )
      })
    })

    describe('when the response data has ok = false', () => {
      it('should throw a client error', async () => {
        response = { ...response, ok: false }
        nock(testUrl).get('/v1/nfts').reply(200, response)
        await expect(client.getNFTs()).rejects.toEqual(
          new ClientError('Unknown error', 200, null)
        )
      })
    })

    describe('when the response data has no error message', () => {
      it('should throw a client error with Unknown Message', async () => {
        response = { ...response, ok: false }
        nock(testUrl).get('/v1/nfts').reply(200, response)
        await expect(client.getNFTs()).rejects.toEqual(
          new ClientError('Unknown error', 200, null)
        )
      })
    })

    describe('when the response data has an error message', () => {
      it('should throw a client error with Unknown Message', async () => {
        const error = 'Some Error'
        response = { ...response, ok: false, error }
        nock(testUrl).get('/v1/nfts').reply(200, response)
        await expect(client.getNFTs()).rejects.toEqual(
          new ClientError(error, 200, null)
        )
      })
    })
  })
})

describe('when getting a single nft', () => {
  let url: string
  let response: ServerResponse<NFT>
  let getNFTParams: GetNFTParams

  beforeEach(() => {
    url = '/v1/nfts/contractAddress/tokenId'
    response = {
      ok: true,
      data: mockNFT
    }
    getNFTParams = {
      contractAddress: 'contractAddress',
      tokenId: 'tokenId'
    }
  })

  it("should return the data of the request's response", async () => {
    nock(testUrl).get(url).reply(200, response)
    const data = await client.getNFT(getNFTParams)
    expect(data).toEqual(response.data)
  })

  describe('when the request fails without a response', () => {
    it('should throw a client error with the message of the error', async () => {
      await expect(client.getNFT(getNFTParams)).rejects.toEqual(
        new ClientError(
          'request to http://test-url/v1/nfts/contractAddress/tokenId failed, reason: Nock: Disallowed net connect for "test-url:80/v1/nfts/contractAddress/tokenId"',
          undefined,
          null
        )
      )
    })
  })

  describe('when the fetch fails with a response', () => {
    describe('when the fetch response is not ok', () => {
      it('should throw a client error', async () => {
        nock(testUrl).get(url).reply(500, response)
        await expect(client.getNFT(getNFTParams)).rejects.toEqual(
          new ClientError('Unknown error', 500, null)
        )
      })
    })

    describe('when the response data has ok = false', () => {
      it('should throw a client error', async () => {
        response = { ...response, ok: false }
        nock(testUrl).get(url).reply(200, response)
        await expect(client.getNFT(getNFTParams)).rejects.toEqual(
          new ClientError('Unknown error', 200, null)
        )
      })
    })

    describe('when the response data has no error message', () => {
      it('should throw a client error with Unknown Message', async () => {
        response = { ...response, ok: false }
        nock(testUrl).get(url).reply(200, response)
        await expect(client.getNFT(getNFTParams)).rejects.toEqual(
          new ClientError('Unknown error', 200, null)
        )
      })
    })

    describe('when the response data has an error message', () => {
      it('should throw a client error with Unknown Message', async () => {
        const error = 'Some Error'
        response = { ...response, ok: false, error }
        nock(testUrl).get(url).reply(200, response)
        await expect(client.getNFT(getNFTParams)).rejects.toEqual(
          new ClientError(error, 200, null)
        )
      })
    })
  })
})
