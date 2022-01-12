import FormData from 'form-data'
import crossFetch from 'cross-fetch'
import { Authenticator, AuthIdentity } from 'dcl-crypto'
import { Content } from '../content/types'
import { ThirdParty, ThirdPartyItemTier } from '../thirdParty'
import { RemoteItem, LocalItem } from '../item/types'
import { ClientError } from './BuilderClient.errors'
import { ServerResponse } from './types'
import { buildURLParams } from './http'

export class BuilderClient {
  private fetch: (
    url: string,
    init?: RequestInit & { params?: Record<string, string> }
  ) => Promise<Response>
  private readonly AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'

  constructor(
    url: string,
    private identity: AuthIdentity,
    private address: string,
    externalFetch: typeof fetch = crossFetch
  ) {
    this.fetch = (...args) => {
      const path = args[0]
      const method: string = args[1]?.method ?? args[0] ?? 'get'
      let fullUrl = url + path
      if (args[1]?.params) {
        fullUrl += buildURLParams(args[1]?.params)
      }

      return externalFetch(fullUrl, {
        ...args[1],
        headers: {
          ...args[1]?.headers,
          ...this.createAuthHeaders(method, path.replace(/\/v[0-9]/, ''))
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
    const headers: Record<string, string> = {}
    const endpoint = (method + ':' + path).toLowerCase()
    const authChain = Authenticator.signPayload(this.identity, endpoint)
    for (let i = 0; i < authChain.length; i++) {
      headers[this.AUTH_CHAIN_HEADER_PREFIX + i] = JSON.stringify(authChain[i])
    }
    return headers
  }

  /**
   * Updates or inserts an item.
   * @param item - The item to insert or update.
   * @param newContent - The content to be added or updated in the item. This content must be contained in the items contents.
   */
  async upsertItem(
    item: LocalItem,
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
    try {
      upsertResponse = await this.fetch(`/v1/items/${item.id}`, {
        body: JSON.stringify({ item: { ...item, eth_address: this.address } }),
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
        formData.append(item.contents[path], newContent[path])
      }

      let uploadResponse: Response

      try {
        uploadResponse = await this.fetch(`/v1/items/${item.id}/files`, {
          body: formData as unknown as BodyInit,
          method: 'post'
        })
      } catch (error) {
        throw new ClientError(error.message, undefined, null)
      }

      const uploadResponseBody: ServerResponse<unknown> =
        await uploadResponse.json()

      if (!uploadResponse.ok || !uploadResponseBody.ok) {
        throw new ClientError(
          uploadResponseBody.error ?? 'Unknown error',
          upsertResponse.status,
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
  async getContentSize(contentIdentifier: string): Promise<number> {
    let contentsResponse: Response
    try {
      contentsResponse = await this.fetch(
        `/v1/storage/contents/${contentIdentifier}`,
        { method: 'head' }
      )
    } catch (error) {
      throw new ClientError(
        error.response?.data.error,
        error.response?.status,
        error.response?.data.error.data
      )
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

  async getThirdParties(manager?: string): Promise<ThirdParty[]> {
    let thirdPartiesResponse: Response
    try {
      thirdPartiesResponse = await this.fetch(`/v1/thirdParties`, {
        method: 'get',
        params: manager ? { manager } : undefined
      })
    } catch (error) {
      throw new ClientError(error.message, undefined, null)
    }

    const thirdPartiesResponseBody: ServerResponse<ThirdParty[]> =
      await thirdPartiesResponse.json()

    if (!thirdPartiesResponse.ok || !thirdPartiesResponseBody.ok) {
      throw new ClientError(
        thirdPartiesResponseBody.error ?? 'Unknown error',
        thirdPartiesResponse.status,
        thirdPartiesResponseBody.data
      )
    }

    return thirdPartiesResponseBody.data
  }

  async getThirdPartyItemTiers(): Promise<ThirdPartyItemTier[]> {
    let tiersResponse: Response

    try {
      tiersResponse = await this.fetch(`/v1/tiers/thirdParty`, {
        method: 'get'
      })
    } catch (error) {
      throw new ClientError(error.message, undefined, null)
    }
    const tiersResponseBody: ServerResponse<ThirdPartyItemTier[]> =
      await tiersResponse.json()

    if (!tiersResponse.ok || !tiersResponseBody.ok) {
      throw new ClientError(
        tiersResponseBody.error ?? 'Unknown error',
        tiersResponse.status,
        tiersResponseBody.data
      )
    }

    return tiersResponseBody.data
  }
}
