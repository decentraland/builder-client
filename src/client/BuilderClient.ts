import FormData from 'form-data'
import { Buffer } from 'buffer'
import crossFetch from 'cross-fetch'
import { Authenticator, AuthIdentity } from '@dcl/crypto'
import { RemoteItem, LocalItem } from '../item/types'
import { Content } from '../content/types'
import { ClientError } from './BuilderClient.errors'
import {
  GetNFTParams,
  GetNFTsParams,
  GetNFTsResponse,
  LandCoords,
  LandHashes,
  NFT,
  ServerResponse,
  ThirdParty
} from './types'
import { URL_MAX_LENGTH } from './constants'

export class BuilderClient {
  private fetch: (
    url: string,
    init?: RequestInit & { authenticated?: boolean }
  ) => Promise<Response>
  private readonly AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
  private readonly getIdentity: () => AuthIdentity
  private readonly getAddress: () => string
  private readonly baseUrl: string

  constructor(
    url: string,
    identity: AuthIdentity | ((...args: unknown[]) => AuthIdentity),
    address: string | ((...args: unknown[]) => string),
    externalFetch: typeof fetch = crossFetch
  ) {
    this.getIdentity = () =>
      identity instanceof Function ? identity() : identity
    this.getAddress = () => (address instanceof Function ? address() : address)

    this.baseUrl = url

    this.fetch = (
      path: string,
      init?: RequestInit & { authenticated?: boolean }
    ) => {
      const method: string = init?.method ?? path ?? 'get'
      const fullUrl = url + path
      let authenticated = true
      if (init && init.authenticated !== undefined) {
        authenticated = init.authenticated
        delete init.authenticated
      }

      return externalFetch(fullUrl, {
        ...init,
        headers: {
          ...init?.headers,
          ...(authenticated
            ? this.createAuthHeaders(method, path.replace(/\/v[0-9]/, ''))
            : undefined)
        }
      })
    }
  }

  /**
   * Creates the authorization headers for the given method and path.
   * @param method - The HTTP method.
   * @param path - The HTTP request path.
   */
  private createAuthHeaders(
    method: string,
    path: string
  ): Record<string, string> {
    const identity = this.getIdentity()

    const headers: Record<string, string> = {}
    const endpoint = (method + ':' + path).toLowerCase()
    const authChain = Authenticator.signPayload(identity, endpoint)
    for (let i = 0; i < authChain.length; i++) {
      headers[this.AUTH_CHAIN_HEADER_PREFIX + i] = JSON.stringify(authChain[i])
    }
    return headers
  }

  private convertToFormDataBinary(data: Content): Blob | Buffer {
    const blobExists = globalThis.Blob !== undefined
    const bufferExists = Buffer !== undefined
    if (
      (blobExists && data instanceof globalThis.Blob) ||
      (bufferExists && Buffer.isBuffer(data))
    ) {
      return data
    }

    if (
      blobExists &&
      (data instanceof Uint8Array || data instanceof ArrayBuffer)
    ) {
      return new Blob([data])
    } else if (bufferExists && data instanceof Uint8Array) {
      return Buffer.from(data.buffer)
    } else if (bufferExists && data instanceof ArrayBuffer) {
      return Buffer.from(data)
    }

    throw new Error('Unsupported content type')
  }

  /**
   * Updates or inserts an item. The item can be updated by id or URN.
   * @param item - The item to insert or update.
   * @param newContent - The content to be added or updated in the item. This content must be contained in the items contents.
   */
  public async upsertItem(
    item: Omit<LocalItem, 'id'> & { id?: LocalItem['id'] },
    newContent: Record<string, Content>
  ): Promise<RemoteItem> {
    const contentIsContainedInItem = Object.keys(newContent).every(
      (key) => key in item.contents
    )
    if (!contentIsContainedInItem) {
      throw new Error('The new content is not contained in the item contents')
    }

    let upsertResponse: Response
    let upsertResponseBody: ServerResponse<RemoteItem>
    const endpointParam = item.id ?? item.urn
    try {
      upsertResponse = await this.fetch(`/v1/items/${endpointParam}`, {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          item: { ...item, eth_address: this.getAddress() }
        }),
        method: 'put'
      })
      upsertResponseBody =
        (await upsertResponse.json()) as ServerResponse<RemoteItem>
    } catch (error) {
      throw new ClientError(error.message, undefined, null)
    }

    if (!upsertResponse.ok || !upsertResponseBody.ok) {
      throw new ClientError(
        upsertResponseBody.error ?? 'Unknown error',
        upsertResponse.status,
        upsertResponseBody.data
      )
    }

    if (Object.keys(newContent).length > 0) {
      const formData = new FormData()
      for (const path in newContent) {
        formData.append(
          item.contents[path],
          this.convertToFormDataBinary(newContent[path]),
          path
        )
      }

      let uploadResponse: Response

      try {
        uploadResponse = await this.fetch(
          `/v1/items/${item.id ?? upsertResponseBody.data.id}/files`,
          {
            body: formData as unknown as BodyInit,
            method: 'post'
          }
        )
      } catch (error) {
        throw new ClientError(error.message, undefined, null)
      }

      const uploadResponseBody: ServerResponse<unknown> =
        await uploadResponse.json()

      if (!uploadResponse.ok || !uploadResponseBody.ok) {
        throw new ClientError(
          uploadResponseBody.error ?? 'Unknown error',
          uploadResponse.status,
          uploadResponseBody.data
        )
      }
    }

    return upsertResponseBody.data
  }

  /**
   * Gets the content size of an already uploaded content file.
   * @param contentIdentifier - The content hash.
   */
  public async getContentSize(contentIdentifier: string): Promise<number> {
    let contentsResponse: Response
    try {
      contentsResponse = await this.fetch(
        `/v1/storage/contents/${contentIdentifier}`,
        { method: 'head' }
      )
    } catch (error) {
      throw new ClientError(error.message, undefined, null)
    }

    if (
      !contentsResponse.ok ||
      !contentsResponse.headers.has('content-length')
    ) {
      throw new ClientError(
        'An error occurred trying to get the size of a content',
        contentsResponse.status,
        null
      )
    }

    return Number(contentsResponse.headers.get('content-length'))
  }

  /**
   * The ID of the third party to retrieve.
   * @param thirdPartyId - The third party id (urn:decentraland:mumbai:collections-thirdparty:third-part-name).
   */
  public async getThirdParty(thirdPartyId: string): Promise<ThirdParty> {
    let thirdPartyResponse: Response
    let thirdPartyResponseBody: ServerResponse<ThirdParty>

    try {
      thirdPartyResponse = await this.fetch(`/v1/thirdParties/${thirdPartyId}`)
    } catch (error) {
      throw new ClientError(error.message, undefined, null)
    }

    if (!thirdPartyResponse.ok) {
      throw new ClientError(
        'Unexpected response status',
        thirdPartyResponse.status,
        null
      )
    }

    const responseContentType = thirdPartyResponse.headers.get('content-type')

    if (
      !responseContentType ||
      !responseContentType.includes('application/json')
    ) {
      throw new ClientError(
        'Unexpected content-type in response',
        thirdPartyResponse.status,
        null
      )
    }

    try {
      thirdPartyResponseBody =
        (await thirdPartyResponse.json()) as ServerResponse<ThirdParty>
    } catch (error) {
      throw new ClientError(error.message, thirdPartyResponse.status, null)
    }

    if (!thirdPartyResponseBody.ok) {
      throw new ClientError(
        thirdPartyResponseBody.error ?? 'Unknown error',
        thirdPartyResponse.status,
        thirdPartyResponseBody.data
      )
    }

    return thirdPartyResponseBody.data
  }

  /**
   * Gets the external NFTs owned by the user.
   * @param options - A set of options to query the NFTs.
   */
  public async getNFTs({
    owner,
    first,
    skip,
    cursor
  }: GetNFTsParams = {}): Promise<GetNFTsResponse> {
    const params: string[] = []

    let url = '/v1/nfts'

    if (owner) {
      params.push(`owner=${owner}`)
    }

    if (first) {
      params.push(`first=${first}`)
    }

    if (skip) {
      params.push(`skip=${skip}`)
    }

    if (cursor) {
      params.push(`cursor=${cursor}`)
    }

    if (params.length > 0) {
      url = `${url}?${params.join('&')}`
    }

    let res: Response

    try {
      res = await this.fetch(url)
    } catch (e) {
      throw new ClientError(e.message, undefined, null)
    }

    const body: ServerResponse<GetNFTsResponse> = await res.json()

    if (!res.ok || !body.ok) {
      throw new ClientError(body.error || 'Unknown error', res.status, null)
    }

    return body.data
  }

  public async getNFT({ contractAddress, tokenId }: GetNFTParams) {
    let res: Response

    try {
      res = await this.fetch(`/v1/nfts/${contractAddress}/${tokenId}`)
    } catch (e) {
      throw new ClientError(e.message, undefined, null)
    }

    const body: ServerResponse<NFT> = await res.json()

    if (!res.ok || !body.ok) {
      throw new ClientError(body.error || 'Unknown error', res.status, null)
    }

    return body.data
  }

  public async createLandRedirectionFile(
    { x, y }: LandCoords,
    locale: string
  ): Promise<LandHashes> {
    let res: Response

    try {
      res = await this.fetch(`/v1/lands/${x},${y}/redirection`, {
        method: 'post',
        headers: {
          'accept-language': locale
        },
        authenticated: false
      })
    } catch (e) {
      throw new ClientError(e.message, undefined, null)
    }

    const body: ServerResponse<LandHashes> = await res.json()

    if (!res.ok || !body.ok) {
      throw new ClientError(body.error || 'Unknown error', res.status, null)
    }

    return body.data
  }

  public async getLandRedirectionHashes(
    coordsList: LandCoords[],
    locale: string
  ): Promise<(LandCoords & LandHashes)[]> {
    const basePath = '/v1/lands/redirectionHashes'
    const paths: string[] = []
    let path = basePath

    for (const [index, coord] of coordsList.entries()) {
      const newPath = `${path}${index === 0 ? '?' : '&'}coords=${coord.x},${
        coord.y
      }`
      if (newPath.length + this.baseUrl.length > URL_MAX_LENGTH) {
        paths.push(path)
        path = `${basePath}?coords=${coord.x},${coord.y}`
      } else {
        path = newPath
      }
    }
    paths.push(path)

    let output: (LandCoords & LandHashes)[] = []

    for (const path of paths) {
      let res: Response

      try {
        res = await this.fetch(path, {
          headers: {
            'accept-language': locale
          },
          authenticated: false
        })
      } catch (e) {
        throw new ClientError(e.message, undefined, null)
      }

      const body: ServerResponse<(LandCoords & LandHashes)[]> = await res.json()

      if (!res.ok || !body.ok) {
        throw new ClientError(body.error || 'Unknown error', res.status, null)
      }

      output = output.concat(body.data)
    }

    return output
  }
}
