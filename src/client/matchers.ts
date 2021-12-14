const addressExpression = '0x[a-fA-F0-9]{40}'
const expirationDateExpression =
  '\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(\\.\\d+)?(([+-]\\d\\d:\\d\\d)|Z)?'

export const addressRegex = new RegExp(`^${addressExpression}$`)
export const publicKeyRegex = /^0x[a-fA-F0-9]{130}$/
export const secondHeaderPayloadRegex = new RegExp(
  `^Decentraland Login\\sEphemeral address: ${addressExpression}\\sExpiration: ${expirationDateExpression}$`
)
