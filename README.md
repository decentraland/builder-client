<img src="https://ui.decentraland.org/decentraland_256x256.png" height="128" width="128" />

# Builder Client

[![NPM version](https://badge.fury.io/js/@dcl%2Fbuilder-client.svg)](https://www.npmjs.com/package/@dcl/builder-client/v/latest)
[![Install Size](https://packagephobia.now.sh/badge?p=@dcl/builder-client@latest)](https://packagephobia.now.sh/result?p=@dcl/builder-client@latest)
[![Coverage Status](https://coveralls.io/repos/github/decentraland/builder-client/badge.svg?branch=main)](https://coveralls.io/github/decentraland/builder-client?branch=main)

A TypeScript/JavaScript client library for interacting with the Decentraland Builder Server API. It provides utilities for managing wearables, emotes, and other items programmatically.

## Table of Contents

- [Features](#features)
- [Dependencies & Related Services](#dependencies--related-services)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Using the Builder Client](#using-the-builder-client)
  - [Using the Item Factory](#using-the-item-factory)
  - [Loading Items from Files](#loading-items-from-files)
- [Testing](#testing)

## Features

- **BuilderClient**: HTTP client for Builder Server API with authenticated requests using `@dcl/crypto`
- **ItemFactory**: Builder pattern for creating and editing wearable/emote items
- **File Loading**: Utilities to load items from ZIP files, model files, and config files (`wearable.json`, `builder.json`)
- **Content Hashing**: Content hash generation for item files using `@dcl/hashing`
- **Third-Party Support**: Fetch and manage third-party collections and items

## Dependencies & Related Services

This library interacts with the following services:

- **[Builder Server](https://github.com/decentraland/builder-server)**: Backend API for storing projects, items, collections, and content

## Getting Started

### Prerequisites

- **Node.js**: Version 14.x or higher
- **npm**: Version 6.x or higher

### Installation

```bash
npm install @dcl/builder-client
```

## Usage

### Using the Builder Client

Using the builder client requires an `AuthIdentity` to be created.

An `AuthIdentity` is an object containing:

- An ephemeral identity, that is, an address and a private and public key generated randomly.
- An expiration date, used to expire any signed messages.
- An AuthChain, which is a list of authorization objects used to validate the signed messages.

The library provides a function `createIdentity` that uses a `Signer` from `ethers`, but any other implementation can be created to craft such identity.

Creating the identity using the `createIdentity` can be easily done in Node.js by instantiating an ethers wallet using a private key:

```typescript
const wallet = new ethers.Wallet('aPrivateKey')
const identity = await createIdentity(wallet, 1000)
```

or by using a JsonRpcProvider:

```typescript
const provider = new ethers.providers.JsonRpcProvider()
```

To use the `BuilderClient`, just instantiate the class with the builder-server url, the identity and the signer's address:

```typescript
const client = new BuilderClient(
  'https://builder-api.decentraland.org/v1',
  identity,
  address
)
```

### Using the Item Factory

Building items is done by using the `ItemFactory`. The `ItemFactory` is a class that can be instantiated with an older item or in blank.

#### Initializing a new item

If the factory was instantiated without an item, a new item can be created by using the `newItem` method that creates a basic item to later work on it.

```typescript
// Initializes the factory
const itemFactory = new ItemFactory()
// Creates a new item
itemFactory.newItem({
  id: 'anId'
  name: 'aName',
  rarity: Rarity.COMMON,
  category: WearableCategory.EYEBROWS,
  collection_id: 'aCollectionId',
  description: 'aDescription'
})
```

#### Editing an item

An `ItemFactory` instantiated with an older item or with a new item can modify every aspect of the item. This is done by using the factory methods:

```typescript
const itemFactory = new ItemFactory(oldItem)
itemFactory
  .withId('anId')
  .withName('aName')
  .withRarity(Rarity.COMMON)
  .withCategory(WearableCategory.EYEBROWS)
  .withCollectionId('aCollectionId')
  .withDescription('aDescription')
```

#### Adding or removing representations

Representations can be added using the `withRepresentation` or `withoutRepresentation` methods.

```typescript
const itemFactory = new ItemFactory(oldItem)
itemFactory.withRepresentation(
  WearableBodyShape.MALE,
  'a_model.glb',
  { 'a_model.glb': modelContent, [THUMBNAIL_PATH]: thumbnailContent },
  {
    triangles: 106,
    materials: 107,
    meshes: 108,
    bodies: 109,
    entities: 110,
    textures: 111
  }
)
```

or deleted from the item using the `withoutRepresentation` method:

```typescript
const itemFactory = new ItemFactory(oldItem)
itemFactory.withoutRepresentation(BodyShapeType.FEMALE)
```

When defining the representation's content, the `contents` field must contain the model and the thumbnail.
The library's user is responsible for providing a thumbnail. The thumbnail can be also be changed / set using the `withThumbnail` method.

### Loading Items from Files

This library provides a function `loadItem` that can be used to load an item from a file. The function accepts four types of files:

1. A zip file that contains only the item's contents.
2. A model file, that contains only the item's model.
3. A zip file that contains the item's contents and the wearable config file `wearable.json` describing the item's information.
4. A zip file that contains the item's contents, the builder config file `builder.json` describing information required for the builder platform and **optionally** the wearable config file `wearable.json` describing the item's information.

For the 1st and 2nd cases, the function will create a `LoadedItem` object that will contain the item's contents as `RawContent`, that is content ready to be used with the ItemFactory, and the property `mainModel` that defines the main model file of the contents.

#### Loading a ZIP file with contents only

When loading a ZIP file that contains only the item's contents (models, textures, etc.) without any config files:

```typescript
// Loads a ZIP file without the wearable config file
const loadedItem = await loadItem('model-without-wearable-config.zip')
const itemFactory = new ItemFactory()
itemFactory.newItem({
  id: 'anId'
  name: 'aName',
  rarity: Rarity.COMMON,
  category: WearableCategory.EYEBROWS,
  collection_id: 'aCollectionId',
  description: 'aDescription'
}).withRepresentation(
    WearableBodyShape.MALE,
    // Uses the main model from the loadedItem variable
    loadedItem.mainModel,
    // Uses the content from the loadedItem variable
    loadedItem.content,
    {
      triangles: 106,
      materials: 107,
      meshes: 108,
      bodies: 109,
      entities: 110,
      textures: 111
    }
  )
```

#### Loading a model file directly

When loading a single model file (e.g., `.glb`, `.gltf`) directly without zipping:

```typescript
// Loads a model file directly
const loadedItem = await loadItem('model.glb')
const itemFactory = new ItemFactory()
itemFactory.newItem({
  id: 'anId'
  name: 'aName',
  rarity: Rarity.COMMON,
  category: WearableCategory.EYEBROWS,
  collection_id: 'aCollectionId',
  description: 'aDescription'
}).withRepresentation(
    WearableBodyShape.MALE,
    // Uses the main model from the loadedItem variable
    loadedItem.mainModel,
    // Uses the content from the loadedItem variable
    loadedItem.content,
    {
      triangles: 106,
      materials: 107,
      meshes: 108,
      bodies: 109,
      entities: 110,
      textures: 111
    }
  )
```

#### Loading a ZIP with wearable.json

For this case, the function will create a `LoadedItem` object that will contain the item's contents as `RawContent`, and it will also contain the `wearable` property that contains the information from the wearable config file.

A wearable config file (`wearable.json`) is a JSON file that contains the item's information:

```json
{
  // The item's URN (optional)
  "id": "urn:decentraland:matic:collections-thirdparty:third-party-id:collection-id:item-id",
  // The item's name
  "name": "test",
  // The item's Rarity (optional for third party items)
  "rarity": "common",
  // The item's description (optional)
  "description": "a description",
  "data": {
    // The item's WearableCategory
    "category": "eyebrows",
    // The HideableWearableCategories that the item hides (optional)
    "hides": [],
    // The HideableWearableCategories that the item replaces (optional)
    "replaces": [],
    // The item's tags (optional)
    "tags": ["special", "new", "eyebrows"],
    // The item's representations (the item must have more than one representation)
    "representations": [
      {
        // The body shapes that the representation will be used for (urn:decentraland:off-chain:base-avatars:BaseMale/urn:decentraland:off-chain:base-avatars:BaseFemale)
        // If multiple body shapes are provided, a representation will be generated with both of them
        "bodyShapes": ["urn:decentraland:off-chain:base-avatars:BaseMale"],
        // The file path (path inside of the zipped file) to the main model of the representation
        "mainFile": "aModelFile.glb",
        // An array of file paths (paths inside the zipped file) to the files that the representation contains
        "contents": ["aModelFile.glb", "aTextureFile.png", "thumbnail.png"],
        // The representation's WearableCategories hides overrides
        "overrideHides": [],
        // The representation's WearableCategories replaces overrides
        "overrideReplaces": []
      }
    ],
    // When true, the vrm export feature will be blocked if this wearable is equipped
    "blockVrmExport": false
  }
}
```

```typescript
const loadedItem = await loadItem('model-with-wearable-config.zip')
const itemFactory = new ItemFactory()
itemFactory.fromConfig(loadedItem.wearable, loadedItem.content)
```

#### Loading a ZIP with builder.json and wearable.json

For this case, providing a `builder.json` file allows extracting information related to the Builder platform. This file can be accompanied optionally with a `wearable.json` file, resulting in a zipped wearable that describes a wearable and its place in the Builder platform.

A builder config file (`builder.json`) is a JSON file that contains Builder platform-specific information:

```json
{
  // The item's ID in the builder platform (optional)
  "id": "f12313b4-a76b-4c9e-a2a3-ab460f59bd67",
  // The collection ID that the item belongs to or should belong to (optional)
  "collectionId": "34262929-3ba9-4a9e-8769-d1a92623d6d1"
}
```

```typescript
const loadedItem = await loadItem('model-with-wearable-and-builder-config.zip')
const itemFactory = new ItemFactory()
itemFactory.fromConfig(
  loadedItem.wearable,
  loadedItem.content,
  loadedItem.builder
)
```

#### Building an item

Building an item is the last step of the item's creation. The `build` method returns a `Promise` that resolves to an object containing the item and the item's new contents:

```typescript
const itemFactory = new ItemFactory(oldItem)
const builtItem = await itemFactory
  .withId('anId')
  .withName('aName')
  .withRarity(Rarity.COMMON)
  .withCategory(WearableCategory.EYEBROWS)
  .withCollectionId('aCollectionId')
  .withDescription('aDescription')
  .withRepresentation(
    WearableBodyShape.MALE,
    'a_model.glb',
    { 'a_model.glb': modelContent, [THUMBNAIL_PATH]: thumbnailContent },
    {
      triangles: 106,
      materials: 107,
      meshes: 108,
      bodies: 109,
      entities: 110,
      textures: 111
    }
  )
  .build()
await client.upsertItem(builtItem.item, builtItem.newContent)
```

**To consider**

The item's thumbnail and the wearable image must be set either manually, by using the factory's `withThumbnail` method or by including the file `thumbnail.png` in the item's contents.

## Testing

This library contains tests that assert the behavior of the client, item factory, and file utilities.

### Running tests

Run all tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run all tests with coverage:

```bash
npm run test:coverage
```

### Test Structure

Tests are written in files named along the file they're testing, with a `.spec.ts` extension:

```
src/
  client/
    BuilderClient.ts
    BuilderClient.spec.ts
  item/
    ItemFactory.ts
    ItemFactory.spec.ts
```

## AI Agent Context

For detailed AI Agent context, see [docs/ai-agent-context.md](docs/ai-agent-context.md).

---
