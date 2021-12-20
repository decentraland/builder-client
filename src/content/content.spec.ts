import { THUMBNAIL_PATH } from '../item/constants'
import { BodyShapeType } from '../item/types'
import { computeHashes, prefixContentName, sortContent } from './content'
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

describe('when sorting the contents', () => {
  let content: RawContent
  beforeEach(() => {
    content = {
      aContent: Buffer.from('something'),
      [THUMBNAIL_PATH]: Buffer.from('thumbnail')
    }
  })

  describe('when the contents are male', () => {
    it('should create a sorted contents object with the male contents', () => {
      expect(sortContent(BodyShapeType.MALE, content)).toEqual({
        male: {
          'male/aContent': content.aContent
        },
        female: {},
        all: {
          'male/aContent': content.aContent,
          [THUMBNAIL_PATH]: content[THUMBNAIL_PATH]
        }
      })
    })
  })

  describe('when the contents are female', () => {
    it('should create a sorted contents object with the female contents', () => {
      expect(sortContent(BodyShapeType.FEMALE, content)).toEqual({
        male: {},
        female: { 'female/aContent': content.aContent },
        all: {
          'female/aContent': content.aContent,
          [THUMBNAIL_PATH]: content[THUMBNAIL_PATH]
        }
      })
    })
  })

  describe('when the contents are both', () => {
    it('should create a sorted contents object with the both contents', () => {
      expect(sortContent(BodyShapeType.BOTH, content)).toEqual({
        male: {
          'male/aContent': content.aContent
        },
        female: {
          'female/aContent': content.aContent
        },
        all: {
          'male/aContent': content.aContent,
          'female/aContent': content.aContent,
          [THUMBNAIL_PATH]: content[THUMBNAIL_PATH]
        }
      })
    })
  })
})
