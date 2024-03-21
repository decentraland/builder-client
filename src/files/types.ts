import { ErrorObject } from 'ajv/dist/core'
import {
  StandardProps,
  ThirdPartyProps,
  Wearable,
  Scene,
  EmoteCategory,
  EmotePlayMode,
  Rarity
} from '@dcl/schemas'
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

export type EmoteConfig = {
  name?: string
  description?: string
  category?: EmoteCategory
  rarity?: Rarity
  play_mode?: EmotePlayMode
  tags?: string[]
}

export type SceneConfig = Scene

export type LoadedFile<T extends Content> = {
  content: RawContent<T>
  wearable?: WearableConfig
  scene?: SceneConfig
  builder?: BuilderConfig
  emote?: EmoteConfig
  mainModel?: string
}

export type AjvError = ErrorObject<string, Record<string, unknown>, unknown>

export type ErrorHandlerBySceneProperty = {
  [P in keyof Partial<SceneConfig>]: (
    error: AjvError,
    errors: AjvError[],
    sceneConfig: SceneConfig
  ) => void
}

export enum FileType {
  WEARABLE = 'wearable',
  SKIN = 'skin',
  THUMBNAIL = 'thumbnail',
  EMOTE = 'emote'
}
