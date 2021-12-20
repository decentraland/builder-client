<img src="https://ui.decentraland.org/decentraland_256x256.png" height="128" width="128" />

# Builder client

[![NPM version](https://badge.fury.io/js/@dcl/builder-client.svg)](https://npmjs.org/package/@dcl/builder-client@latest)
[![Install Size](https://packagephobia.now.sh/badge?p=@dcl/builder-client@latest)](https://packagephobia.now.sh/result?p=@dcl/builder-client@latest)

## Using the Builder client

Using the builder client requires an identity to be created. The library provides a function `createIdentity` that uses a `Signer` from `ethers`, but any other implementation can be created to craft such identity.

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

## Using the Item Factory

Building items is done by using the `ItemFactory`. The `ItemFactory` is a class that can be instantiated with an older item or in blank.

### Initializing a new item

If the factory was instantiated without an item, a new item can be created by using the `newItem` method that creates a basic item to later work on it.

```typescript
// Initializes the factory
const itemFactory = new ItemFactory()
// Creates a new item
itemFactory.newItem(
  'anId',
  'aName',
  Rarity.COMMON,
  WearableCategory.EYEBROWS,
  'aCollectionId',
  'aDescription'
)
```

### Editing an item

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

### Adding or removing representations to an item

Representations can be added using the `withRepresentation`: or `withoutRepresentation` methods.

```typescript
const itemFactory = new ItemFactory(oldItem)
itemFactory
  .withRepresentation(
      bodyShape: BodyShapeType.MALE,
      model: 'a_model.glb',
      contents: { 'a_model.glb': modelContent, [THUMBNAIL_PATH]: thumbnailContent },
      metrics: {
        triangles: 106,
        materials: 107,
        meshes: 108,
        bodies: 109,
        entities: 110,
        textures: 111
      }
  })
```

or deleted from the item using the `withoutRepresentation` method:

```typescript
const itemFactory = new ItemFactory(oldItem)
itemFactory.withoutRepresentation(BodyShapeType.FEMALE)
  })
```

The metrics must used in the `withRepresentation` method must be computed by the library's user.
These metrics are used to display information about the model in the Builder's UI. They're important mostly to curators.

When defining the representation's content, the `contents` field must contain the model and the thumbnail.
The library's user is responsible for providing a thumbnail. The thumbnail can be also be changed / set using the `withThumbnail` method.

### Building an item

Building an item is the last step of the item's creation. The `build` method returns a `Promise` that resolves to an object containing the
item and the item's new contents, that is the variables values that are needed to do an item insert or update using the client.

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
    bodyShape: BodyShapeType.MALE,
    model: 'a_model.glb',
    contents: { 'a_model.glb': modelContent, [THUMBNAIL_PATH]: thumbnailContent },
    metrics: {
      triangles: 106,
      materials: 107,
      meshes: 108,
      bodies: 109,
      entities: 110,
      textures: 111
    }
  })
  .build()
client.upsertItem(builtItem.item, builtItem.newContent)
```
