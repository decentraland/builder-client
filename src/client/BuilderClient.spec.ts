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
import {
  GetNFTParams,
  GetNFTsResponse,
  LandHashes,
  LandCoords,
  NFT,
  ServerResponse,
  ThirdParty
} from './types'

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
      tags: [],
      blockVrmExport: false
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
    contract: { address: 'address', name: 'decentraland-wearables' },
    description: 'description',
    imageUrl: 'image_url',
    name: 'name',
    tokenId: 'token_id'
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

      describe('and it is upserting the item by id', () => {
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

      describe('and it is upserting the item by URN', () => {
        let itemWithURN: Omit<LocalItem, 'id'> & { id?: LocalItem['id'] }
        beforeEach(() => {
          itemWithURN = {
            ...item,
            urn: 'urn:decentraland:mumbai:collections-thirdparty:thirdparty2:tercer-fiesta-2'
          }
          delete itemWithURN.id

          nockedUpsert = nock(testUrl)
            .put(`/v1/items/${itemWithURN.urn}`, {
              item: { ...itemWithURN, eth_address: address }
            })
            .matchHeader(FIRST_AUTH_HEADER, firstHeaderValueMatcher)
            .matchHeader(SECOND_AUTH_HEADER, secondHeaderValueMatcher)
            .matchHeader(
              THIRD_AUTH_HEADER,
              thirdHeaderValueMatcher('put', `/items/${itemWithURN.urn}`)
            )
            .matchHeader('content-type', 'application/json')
            .reply(200, {
              data: remoteItem,
              ok: true
            })

          nockedFileUpload = nock(testUrl)
            .post(
              `/v1/items/${remoteItem.id}/files`,
              /form-data; name="QmaX5DcQkjtgfQK3foNhZLYVbUzVAU6m5Gh1GtjT4f6G3i"[^]*someContent\r\n/m
            )
            .matchHeader('content-type', /^multipart\/form-data;.+/)
            .reply(200, {
              data: {},
              ok: true
            })
        })

        describe('and there are no item contents to update', () => {
          beforeEach(async () => {
            result = await client.upsertItem(itemWithURN, {})
          })
          it('should have performed the request to insert/update the item with the given item urn', () => {
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
            result = await client.upsertItem(itemWithURN, {
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

    describe('and the builder client is constructed with a constant for the identity and the address', () => {
      beforeEach(async () => {
        const wallet = new ethers.Wallet(fakePrivateKey)
        const identity = await createIdentity(wallet, 1000)
        client = new BuilderClient(testUrl, identity, address)
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

describe('when getting a third party', () => {
  let url: string
  let thirdPartyId: string
  let response: ServerResponse<ThirdParty> | ServerResponse<null>

  beforeEach(() => {
    thirdPartyId = 'aThirdPartyId'
    url = `/v1/thirdParties/${thirdPartyId}`
  })

  describe('when the response status differs from being ok', () => {
    beforeEach(() => {
      nock(testUrl).get(url).reply(500)
    })

    it('should throw a client error with the "Unexpected response status" message', async () => {
      await expect(client.getThirdParty(thirdPartyId)).rejects.toEqual(
        new ClientError('Unexpected response status', 500, null)
      )
    })
  })

  describe("when the response body doesn't contain JSON data", () => {
    beforeEach(() => {
      nock(testUrl)
        .get(url)
        .reply(200, undefined, { 'Content-Type': 'text/html' })
    })

    it('should throw a client error with the "Unexpected content-type in response" message', async () => {
      await expect(client.getThirdParty(thirdPartyId)).rejects.toEqual(
        new ClientError('Unexpected content-type in response', 500, null)
      )
    })
  })

  describe('when the response body contains an error', () => {
    beforeEach(() => {
      response = {
        ok: false,
        error: 'Some error',
        data: null
      }
      nock(testUrl).get(url).reply(200, response)
    })

    it('should throw a client error with the error in the body', async () => {
      await expect(client.getThirdParty(thirdPartyId)).rejects.toEqual(
        new ClientError(response.error as string, 200, response.data)
      )
    })
  })

  describe('when the response body contains a third party', () => {
    beforeEach(() => {
      response = {
        ok: true,
        data: {
          id: 'urn:decentraland:mumbai:collections-thirdparty:some-name',
          root: '0xb6c6bc2f72b3fe1970806ec958341ad3cddef7b1a6ac347014ddba4f4b84151b',
          name: 'Some name',
          description: 'Some description',
          managers: ['0x747c6f502272129bf1ba872a1903045b837ee86c'],
          maxItems: '110',
          totalItems: '0'
        }
      }
      nock(testUrl).get(url).reply(200, response)
    })

    it('should return the received third party', async () => {
      await expect(client.getThirdParty(thirdPartyId)).resolves.toEqual(
        response.data
      )
    })
  })
})

describe('when creating the LAND redirection file', () => {
  let url: string
  let coords: { x: number; y: number }

  beforeEach(() => {
    coords = { x: 100, y: 400 }
    url = `/v1/lands/${coords.x},${coords.y}/redirection`
  })

  describe('and the endpoint responds with non 200 status code', () => {
    let response: ServerResponse<unknown>

    beforeEach(() => {
      response = {
        ok: false,
        data: {},
        error: 'Some error'
      }
      nock(testUrl).post(url).reply(500, response)
    })

    it("should throw an error with the server's error message", () => {
      return expect(
        client.createLandRedirectionFile(coords, 'en-us')
      ).rejects.toEqual(new ClientError('Some error', 500, {}))
    })
  })

  describe('and the data returned from the endpoint has ok as false', () => {
    let response: ServerResponse<unknown>

    beforeEach(() => {
      response = {
        ok: false,
        data: {},
        error: 'Some error'
      }
      nock(testUrl).post(url).reply(200, response)
    })

    it("should throw an error with the server's error message", () => {
      return expect(
        client.createLandRedirectionFile(coords, 'en-us')
      ).rejects.toEqual(new ClientError('Some error', 200, {}))
    })
  })

  describe('and the endpoint responds with a 200 status code and the hashed data', () => {
    let response: ServerResponse<LandHashes>

    beforeEach(() => {
      response = {
        ok: true,
        data: {
          contentHash:
            'e301017012205453e784584c205c23a771c67af071129721f0e21b0472e3061361005393a908',
          ipfsHash: 'QmU1qAKrZKEUinZ7j7gbPcJ7dKSkJ6diHLk9YrB4PbLr7q'
        }
      }
      nock(testUrl).post(url).reply(200, response)
    })

    it('should return the LAND hashes of the redirection file of the sent coordinates', () => {
      return expect(
        client.createLandRedirectionFile(coords, 'en-us')
      ).resolves.toEqual(response.data)
    })
  })
})

describe('when getting LAND redirection hashes', () => {
  let url: string
  let coords: LandCoords[]

  describe("and the amount of cords don't overpass the URL length limit", () => {
    let response: ServerResponse<(LandCoords & LandHashes)[]>

    beforeEach(() => {
      coords = [
        { x: 100, y: 400 },
        { x: 150, y: 450 }
      ]
      url = `/v1/lands/redirectionHashes?${coords
        .map((coord) => `coords=${coord.x},${coord.y}`)
        .join('&')}`
      response = {
        ok: true,
        data: coords.map((coord) => ({
          x: coord.x,
          y: coord.y,
          contentHash: `${coord.x},${coord.y}-content-hash`,
          ipfsHash: `${coord.x},${coord.y}-ipfs-hash`
        }))
      }
      nock(testUrl, { badheaders: ['x-identity-auth-chain-'] })
        .get(url)
        .reply(200, response)
    })

    it('should respond with the hashes of each coord', () => {
      return expect(
        client.getLandRedirectionHashes(coords, 'en-us')
      ).resolves.toEqual(response.data)
    })
  })

  describe('and the amount of cords overpass the URL length limit', () => {
    let responses: ServerResponse<(LandCoords & LandHashes)[]>[]

    beforeEach(() => {
      coords = Array.from({ length: 200 }, (_, i) => ({ x: i, y: i }))
      responses = [
        {
          ok: true,
          data: coords.slice(0, 148).map((coord) => ({
            x: coord.x,
            y: coord.y,
            contentHash: `${coord.x},${coord.y}-content-hash`,
            ipfsHash: `${coord.x},${coord.y}-ipfs-hash`
          }))
        },
        {
          ok: true,
          data: coords.slice(148).map((coord) => ({
            x: coord.x,
            y: coord.y,
            contentHash: `${coord.x},${coord.y}-content-hash`,
            ipfsHash: `${coord.x},${coord.y}-ipfs-hash`
          }))
        }
      ]

      responses.forEach((response) => {
        nock(testUrl)
          .get(
            `/v1/lands/redirectionHashes?${response.data
              .map((coord) => `coords=${coord.x},${coord.y}`)
              .join('&')}`
          )
          .reply(200, response)
      })
    })

    it('should respond with the hashes of each coord by concatenating the response of multiple requests', () => {
      return expect(
        client.getLandRedirectionHashes(coords, 'en-us')
      ).resolves.toEqual(responses.flatMap((response) => response.data))
    })
  })

  describe('and the endpoint responds with a non 200 status code', () => {
    beforeEach(() => {
      coords = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }))
      url = `/v1/lands/redirectionHashes?${coords
        .map((coord) => `coords=${coord.x},${coord.y}`)
        .join('&')}`
      nock(testUrl).get(url).reply(500, {})
    })

    it('should throw an error with the message of the failed request', () => {
      return expect(
        client.getLandRedirectionHashes(coords, 'en-us')
      ).rejects.toEqual(new ClientError('Unknown error', 500, null))
    })
  })

  describe('and the endpoint responds with 200 status code but with ok as false', () => {
    let response: ServerResponse<unknown>

    beforeEach(() => {
      response = {
        ok: false,
        data: {},
        error: 'Some error'
      }
      coords = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }))
      url = `/v1/lands/redirectionHashes?${coords
        .map((coord) => `coords=${coord.x},${coord.y}`)
        .join('&')}`
      nock(testUrl).get(url).reply(200, response)
    })

    it('should throw an error with the message of the failed request', () => {
      return expect(
        client.getLandRedirectionHashes(coords, 'en-us')
      ).rejects.toEqual(new ClientError('Some error', 200, null))
    })
  })
})
