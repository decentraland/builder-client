import { addressRegex, publicKeyRegex } from './matchers'

const hexadecimalNumberExpectations = (
  regex: RegExp,
  lenght: number,
  workingExample: string
) => {
  describe('and the value doesn\'t start with "0x"', () => {
    it('should return false', () => {
      expect(regex.test(workingExample.replace('0x', ''))).toBe(false)
    })
  })

  describe('and the value has an invalid lowercase character', () => {
    it('should return false', () => {
      expect(regex.test(workingExample.replace(/[a-f]/, 'z'))).toBe(false)
    })
  })

  describe('and the value has an invalid uppercase character', () => {
    it('should return false', () => {
      expect(regex.test(workingExample.replace(/[A-F]/, 'Z'))).toBe(false)
    })
  })

  describe('and the value has a length lower than 40 characters', () => {
    it('should return false', () => {
      expect(regex.test(workingExample.slice(0, lenght - 1))).toBe(false)
    })
  })

  describe('and the value has a length greater than 40 characters', () => {
    it('should return false', () => {
      expect(regex.test(workingExample + '4')).toBe(false)
    })
  })

  describe('and the value is a compliant one', () => {
    it('should return true', () => {
      expect(regex.test(workingExample)).toBe(true)
    })
  })
}

describe('when matching an address', () => {
  hexadecimalNumberExpectations(
    addressRegex,
    40,
    '0x95BC61F7E42Db2431c240EE54509c8dC5B2249c9'
  )
})

describe('when matching a public key', () => {
  hexadecimalNumberExpectations(
    publicKeyRegex,
    130,
    '0xd33bd47e586dbdde07d1756d3d2c6d01Cce30f1033b9b721c3229131f2f03313388462fbc790cd6b91b3a316074dbdc288a56715fe903688eb14875d0b7a9a7d1b'
  )
})
