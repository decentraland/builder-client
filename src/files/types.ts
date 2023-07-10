import {
  SceneParcels,
  StandardProps,
  ThirdPartyProps,
  Wearable
} from '@dcl/schemas'
import { Content, RawContent } from '../content/types'

export type SceneConfig = {
  id?: string
  main: string
  scene: SceneParcels
  requiredPermissions?: string[]
}

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

export type LoadedFile<T extends Content> = {
  content: RawContent<T>
  wearable?: WearableConfig
  scene?: SceneConfig
  builder?: BuilderConfig
  mainModel?: string
}
