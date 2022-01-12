export const buildURLParams = (params: Record<string, string>) =>
  Object.keys(params).reduce(
    (accum, param, index) => (index !== 0 ? accum + '&' : '') + param
  )
