import FormData from 'form-data'
import { Buffer } from 'buffer'
import crossFetch from 'cross-fetch'
import { Authenticator, AuthIdentity } from 'dcl-crypto'
import { RemoteItem, LocalItem } from '../item/types'
import { Content } from '../content/types'
import { ClientError } from './BuilderClient.errors'
import { ServerResponse } from './types'

export class BuilderClient {
  private fetch: (url: string, init?: RequestInit) => Promise<Response>
  private readonly AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
  private readonly getIdentity: () => AuthIdentity
  private readonly getAddress: () => string

  constructor(
    url: string,
    identity: AuthIdentity | ((...args: unknown[]) => AuthIdentity),
    address: string | ((...args: unknown[]) => string),
    externalFetch: typeof fetch = crossFetch
  ) {
    this.getIdentity = () =>
      identity instanceof Function ? identity() : identity
    this.getAddress = () => (address instanceof Function ? address() : address)

    this.fetch = (path: string, init?: RequestInit) => {
      const method: string = init?.method ?? path ?? 'get'
      const fullUrl = url + path

      return externalFetch(fullUrl, {
        ...init,
        headers: {
          ...init?.headers,
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
    const identity = this.getIdentity()

    const headers: Record<string, string> = {}
    const endpoint = (method + ':' + path).toLowerCase()
    const authChain = Authenticator.signPayload(identity, endpoint)
    for (let i = 0; i < authChain.length; i++) {
      headers[this.AUTH_CHAIN_HEADER_PREFIX + i] = JSON.stringify(authChain[i])
    }
    return headers
  }

  private convertToFormDataBuffer(data: Content): Blob | Buffer {
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
   * Updates or inserts an item.
   * @param item - The item to insert or update.
   * @param newContent - The content to be added or updated in the item. This content must be contained in the items contents.
   */
  public async upsertItem(
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
          this.convertToFormDataBuffer(newContent[path])
        )
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
}
