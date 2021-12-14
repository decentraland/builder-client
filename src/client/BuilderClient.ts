import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { Authenticator, AuthIdentity } from 'dcl-crypto'
import { FullItem, Item } from '../item/types'
import { fromRemoteItem } from './transformers'
import { ClientError } from './BuilderClient.errors'
import { toRemoteItem } from './transformers'
import { RemoteItem, ServerResponse } from './types'

export class BuilderClient {
  private axios: AxiosInstance
  private readonly AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'

  constructor(url: string, private identity: AuthIdentity) {
    this.axios = axios.create({
      baseURL: url
    })

    // Uses the interceptors API to add the auth headers to all requests
    this.axios.interceptors.request.use((config) => {
      if (!config.method || !config.url) {
        return config
      }

      const headers = this.createAuthHeaders(
        config.method,
        config.url.replace(/\/v[0-9]/, '')
      )
      config.headers = { ...config.headers, ...headers }

      return config
    })

    // Uses the interceptors API to throw when the builder server returns a 200 with a ok property set to false
    this.axios.interceptors.response.use((response) => {
      if (response.data && response.data.ok === false) {
        throw new ClientError(
          response.data.error!,
          response.status,
          response.data.data
        )
      }
      return response
    })
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
    item: Item,
    newContent: Record<string, Blob | Buffer>
  ): Promise<FullItem> {
    const contentIsContainedInItem = Object.keys(newContent).every((key) =>
      Object.prototype.hasOwnProperty.call(item.contents, key)
    )
    if (!contentIsContainedInItem) {
      throw new Error('The new content is not contained in the item contents')
    }

    try {
      const upsertResponse = await this.axios.put<
        ServerResponse & { data: RemoteItem }
      >(`/v1/items/${item.id}`, {
        item: toRemoteItem(item)
      })

      if (Object.keys(newContent).length > 0) {
        const formData = new FormData()
        for (const path in newContent) {
          formData.append(item.contents[path], newContent[path])
        }

        await this.axios.post(`/v1/items/${item.id}/files`, formData)
      }

      return fromRemoteItem(upsertResponse.data.data)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ClientError(
          error.response?.data.error,
          error.response?.status,
          error.response?.data.error.data
        )
      }
      throw error
    }
  }

  /**
   * Gets the content size of an already uploaded content file.
   * @param contentIdentifier - The content hash.
   */
  async getContentSize(contentIdentifier: string): Promise<number> {
    try {
      const response = await this.axios.head(
        `/v1/storage/contents/${contentIdentifier}`
      )
      return Number(response.headers['content-length'])
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ClientError(
          error.response?.data.error,
          error.response?.status,
          error.response?.data.error.data
        )
      } else {
        throw error
      }
    }
  }
}
