export type ServerResponse<T = any> = {
  data: T
  ok: boolean
  error?: string
}
