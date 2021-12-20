import { BodyShapeType } from '../item/types'
import { computeHashes, prefixContentName } from './content'
import { RawContent } from './types'

describe('when computing the hashes of raw content', () => {
  let content: RawContent
  let hashes: Record<string, string>

  beforeEach(async () => {
    content = {
      someThing: Buffer.from('aThing'),
      someOtherThing: Buffer.from('someOtherThing')
    }
    hashes = await computeHashes(content)
  })

  it('should compute the hash of each Uint8Array', () => {
    expect(hashes).toEqual({
      someOtherThing:
        'bafkreiatcrqxiuonjtnt2pml2kmfpct6veomwajfiz5x3t2icj22rpt5ly',
      someThing: 'bafkreig6f2q62jrqswtg4to2yr454aa2amhuevgsyl6oj3qrwshlazufcu'
    })
  })
})

describe('when prefixing the content name', () => {
  const contentName = 'aContentName'

  it('should return the composition of the body shape and the content name', () => {
    expect(prefixContentName(BodyShapeType.MALE, contentName)).toEqual(
      `${BodyShapeType.MALE}/${contentName}`
    )
  })
})
