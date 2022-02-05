import { TextEncoder } from 'util'
import { THUMBNAIL_PATH } from '../item/constants'
import { BodyShapeType } from '../item/types'
import { computeHashes, prefixContentName, sortContent } from './content'
import { RawContent } from './types'

describe('when computing the hashes of raw content', () => {
  let content: RawContent<Uint8Array | ArrayBuffer>
  let hashes: Record<string, string>
  let expectedHashes: Record<string, string>
  let encoder: TextEncoder

  beforeEach(() => {
    encoder = new TextEncoder()
    expectedHashes = {
      someOtherThing:
        'bafkreiatcrqxiuonjtnt2pml2kmfpct6veomwajfiz5x3t2icj22rpt5ly',
      someThing: 'bafkreig6f2q62jrqswtg4to2yr454aa2amhuevgsyl6oj3qrwshlazufcu'
    }
  })

  describe('when the content is in the Uint8Array format', () => {
    beforeEach(async () => {
      content = {
        someThing: encoder.encode('aThing'),
        someOtherThing: encoder.encode('someOtherThing')
      }
      hashes = await computeHashes(content)
    })

    it('should compute the hash of each Uint8Array', () => {
      expect(hashes).toEqual(expectedHashes)
    })
  })

  describe('when the content is in the ArrayBuffer format', () => {
    beforeEach(async () => {
      content = {
        someThing: encoder.encode('aThing').buffer,
        someOtherThing: encoder.encode('someOtherThing').buffer
      }
      hashes = await computeHashes(content)
    })

    it('should compute the hash of each ArrayBuffer', () => {
      expect(hashes).toEqual(expectedHashes)
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
  let content: RawContent<Uint8Array>
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
