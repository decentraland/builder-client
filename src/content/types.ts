export type Content = Uint8Array | Blob

export type SortedContent = {
  male: Record<string, Content>
  female: Record<string, Content>
  all: Record<string, Content>
}

export type HashedContent = Record<string, string>
export type RawContent = Record<string, Content>
