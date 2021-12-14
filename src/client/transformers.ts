import { FullItem, Item } from '../item/types'
import { RemoteItem, UpsertableRemoteItem } from './types'

export function toRemoteItem(item: Item): UpsertableRemoteItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    thumbnail: item.thumbnail,
    eth_address: item.owner,
    collection_id: item.collectionId || null,
    blockchain_item_id: item.tokenId || null,
    price: item.price || null,
    urn: item.urn || null,
    beneficiary: item.beneficiary || null,
    rarity: item.rarity || null,
    type: item.type,
    data: item.data,
    metrics: item.metrics,
    contents: item.contents,
    content_hash: item.contentHash
  }
}

export function fromRemoteItem(remoteItem: RemoteItem): FullItem {
  const item: FullItem = {
    id: remoteItem.id,
    name: remoteItem.name,
    thumbnail: remoteItem.thumbnail,
    owner: remoteItem.eth_address,
    description: remoteItem.description,
    isPublished: remoteItem.is_published,
    isApproved: remoteItem.is_approved,
    inCatalyst: remoteItem.in_catalyst,
    type: remoteItem.type,
    data: remoteItem.data,
    contents: remoteItem.contents,
    contentHash: remoteItem.content_hash,
    metrics: remoteItem.metrics,
    createdAt: +new Date(remoteItem.created_at),
    updatedAt: +new Date(remoteItem.created_at)
  }

  if (remoteItem.collection_id) item.collectionId = remoteItem.collection_id
  if (remoteItem.blockchain_item_id)
    item.tokenId = remoteItem.blockchain_item_id
  if (remoteItem.price) item.price = remoteItem.price
  if (remoteItem.urn) item.urn = remoteItem.urn
  if (remoteItem.beneficiary) item.beneficiary = remoteItem.beneficiary
  if (remoteItem.rarity) item.rarity = remoteItem.rarity
  if (remoteItem.total_supply !== null)
    item.totalSupply = remoteItem.total_supply // 0 is false

  return item
}
