import { Authenticator, AuthIdentity } from 'dcl-crypto'
import { Wallet } from '@ethersproject/wallet'
import { Bytes } from '@ethersproject/bytes'
import { Signer } from '@ethersproject/abstract-signer'

/**
 * Creates an identity to later be used in the IAuthentication implementation.
 * @params signer - Any Ethereum signer (RPC or Wallet signer)
 * @params expiration - ttl in seconds of the identity
 */
export async function createIdentity(
  signer: Signer,
  expiration: number
): Promise<AuthIdentity> {
  const address = await signer.getAddress()

  const wallet = Wallet.createRandom()
  const payload = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey
  }

  const identity = await Authenticator.initializeAuthChain(
    address,
    payload,
    expiration,
    (message: string | Bytes) => signer.signMessage(message)
  )

  return identity
}
