# AI Agent Context

**Library Purpose:**

The Builder Client is a TypeScript/JavaScript library that provides a programmatic interface to the Decentraland Builder Server API. It enables developers to create, edit, and manage wearables and emotes without using the Builder UI, making it suitable for automation, bulk operations, and integration into other tools.

**Key Capabilities:**

- Authenticated HTTP client for Builder Server API using `@dcl/crypto` identity
- Item creation and editing using the builder pattern (ItemFactory)
- File loading from ZIP archives, model files, and config files
- Content hash generation for item files
- Third-party collection and item management
- NFT retrieval for linked wearables
- LAND redirection file management

**Communication Pattern:**

- REST API calls to Builder Server (`/v1/*` endpoints)
- Authenticated requests using AuthChain headers (`x-identity-auth-chain-*`)
- Form data uploads for item content files
- JSON request/response bodies

**Technology Stack:**

- Language: TypeScript
- Runtime: Node.js 14+ or Browser
- HTTP: cross-fetch for universal fetch support
- Cryptography: @dcl/crypto for identity and signing
- Hashing: @dcl/hashing for content hashes
- Schemas: @dcl/schemas for type definitions
- ZIP handling: jszip for file loading
- Blockchain: ethers v5 for wallet signing

**External Dependencies:**

- Builder Server API: Primary backend for all item, collection, and content operations

**Key Concepts:**

- **AuthIdentity**: An ephemeral identity containing an address, key pair, expiration date, and AuthChain for signing API requests
- **ItemFactory**: A builder-pattern class for constructing wearable/emote items with representations, content, and metadata
- **LocalItem**: The client-side representation of an item before it's saved to the server
- **RemoteItem**: The server-side representation of an item after it's been saved
- **Representation**: A body-shape-specific version of a wearable with its 3D model, textures, and metrics
- **Content**: Binary data (Blob, Buffer, Uint8Array, or ArrayBuffer) for item files like models and textures
- **wearable.json**: Configuration file describing item metadata, category, representations, and display settings
- **builder.json**: Configuration file containing Builder platform-specific IDs (item ID, collection ID)
- **Third-Party Items**: Linked wearables from external NFT contracts that map to Decentraland items

**Main Exports:**

```typescript
// Client
export { BuilderClient } from './client'
export { createIdentity } from './client/identity'
export { ClientError } from './client/BuilderClient.errors'

// Item Factory
export { ItemFactory } from './item'
export { THUMBNAIL_PATH } from './item/constants'

// File Loading
export { loadItem } from './files'

// Content Utilities
export { computeHashes, sortContent } from './content'
```
