export type SortedContent = {
  male: Record<string, Blob>
  female: Record<string, Blob>
  all: Record<string, Blob>
}

export type HashedContent = Record<string, string>
export type RawContent = Record<string, Blob>
