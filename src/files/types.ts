import { StandardProps, ThirdPartyProps, Wearable, Scene } from '@dcl/schemas'
import { Content, RawContent } from '../content/types'

export type WearableConfig = Omit<
  Wearable & Partial<StandardProps> & Partial<ThirdPartyProps>,
  | 'id'
  | 'collectionAddress'
  | 'content'
  | 'merkleProof'
  | 'thumbnail'
  | 'image'
  | 'i18n'
  | 'metrics'
  | 'menuBarIcon'
  | 'description'
> & {
  id?: string
  description?: string
}

export type BuilderConfig = {
  id?: string
  collectionId?: string
}

export type SceneConfig = Scene

export type LoadedFile<T extends Content> = {
  content: RawContent<T>
  wearable?: WearableConfig
  scene?: SceneConfig
  builder?: BuilderConfig
  mainModel?: string
}
