import { ethers, Wallet } from 'ethers'
import { fakePrivateKey } from '../test-utils/crypto'
import { createIdentity } from './identity'

describe('when creating the identity', () => {
  let wallet: Wallet

  beforeEach(async () => {
    const authDate = new Date('2020-01-01T00:00:00Z')
    jest.useFakeTimers()
    jest.setSystemTime(authDate)

    wallet = new ethers.Wallet(fakePrivateKey)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should create a new identity for the provided wallet with the given TTL', async () => {
    const identity = await createIdentity(wallet, 1000)
    expect(identity).toEqual({
      authChain: [
        {
          payload: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
          signature: '',
          type: 'SIGNER'
        },
        {
          payload: expect.stringMatching(
            /^Decentraland Login\sEphemeral address: 0x[a-fA-F0-9]{40}\sExpiration: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(([+-]\d\d:\d\d)|Z)?$/
          ),
          signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
          type: 'ECDSA_EPHEMERAL'
        }
      ],
      ephemeralIdentity: {
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        privateKey: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
        publicKey: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/)
      },
      expiration: new Date('2020-01-01T16:40:00.000Z')
    })
  })
})
