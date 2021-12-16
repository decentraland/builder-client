export const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1)

export const toCamelCase = (text: string): string =>
  text.split('_').map(capitalize).join('')
