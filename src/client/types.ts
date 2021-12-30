export type ServerResponse<T> = {
  data: T
  ok: boolean
  error?: string
}
