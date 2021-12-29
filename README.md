<img src="https://ui.decentraland.org/decentraland_256x256.png" height="128" width="128" />

# Builder client

[![NPM version](https://badge.fury.io/js/@dcl/builder-client.svg)](https://npmjs.org/package/@dcl/builder-client@latest)
[![Install Size](https://packagephobia.now.sh/badge?p=@dcl/builder-client@latest)](https://packagephobia.now.sh/result?p=@dcl/builder-client@latest)

## Using the Builder client

Using the builder client requires an `AuthIdentity` to be created.

An `AuthIdentity` is an object containing:

- An ephemeral identity, that is, an address and a private and public key generated randomly.
- An expiration date, used to expire any signed messages.
- An AuthChain, which is a list of authorization objects used to validate the signed messages.

The library provides a function `createIdentity` that uses a `Signer` from `ethers`, but any other implementation can be created to craft such identity.

Creating the identity using the `createIdentity` can be easily done in NodeJS by instantiating an ethers wallet using a private key:

```typescript
const wallet = new ethers.Wallet('aPrivateKey')
const identity = await createIdentity(wallet, 1000)
```

or by using a JsonRpcProvider:

```typescript
const provider = new ethers.providers.JsonRpcProvider()
```

To use the `BuilderClient`, just instantiate the class with the builder-server url and the identity:

```typescript
const client = new BuilderClient('https://httpdump.io', identity)
```
