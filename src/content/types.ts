export type Content = Uint8Array | Blob | ArrayBuffer | Buffer

export type SortedContent<T extends Content> = {
  male: Record<string, T>
  female: Record<string, T>
  all: Record<string, T>
}

export type HashedContent = Record<string, string>
export type RawContent<T extends Content> = Record<string, T>
