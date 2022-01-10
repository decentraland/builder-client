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

To use the `BuilderClient`, just instantiate the class with the builder-server url, the identity and the signer's address:

```typescript
const client = new BuilderClient('https://httpdump.io', identity, address)
```

## Using the Item Factory

Building items is done by using the `ItemFactory`. The `ItemFactory` is a class that can be instantiated with an older item or in blank.

### Initializing a new item

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
```

The metrics used in the `withRepresentation` method must be computed by the library's user.
These metrics are used to display information about the model in the Builder's UI. They're important mostly to curators.

When defining the representation's content, the `contents` field must contain the model and the thumbnail.
The library's user is responsible for providing a thumbnail. The thumbnail can be also be changed / set using the `withThumbnail` method.

### Loading items from files

This library provides a function `loadItem` that can be used to load an item from a file. The function accepts three types of files:

1. A zip file that contains only the item's contents.
2. A model file, that contains only the item's model.
3. A zip file that contains the item's contents and the asset file `asset.json` describing the item's information.

For the 1st and 2nd cases, the function will create a `LoadedItem` object that will contain the item's contents as `RawContent`,
that is content ready to be used with the ItemFactory, and the property `mainModel` that defines the main model file of the contents.

After loading the file, the `LoadedItem` object can be used to create an item using the `ItemFactory`:

```typescript
// Loads a ZIP file without the asset file or a model file
const loadedItem = await loadItem('model-without-asset.zip')
const itemFactory = new ItemFactory()
itemFactory.newItem({
  id: 'anId'
  name: 'aName',
  rarity: Rarity.COMMON,
  category: WearableCategory.EYEBROWS,
  collection_id: 'aCollectionId',
  description: 'aDescription'
}).withRepresentation(
    bodyShape: BodyShapeType.MALE,
    // Uses the main model from the loadedItem variable
    model: loadedItem.mainModel,
    // Uses the content from the loadedItem variable
    contents: loadedItem.content,
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

For the 3rd case, the function will create a `LoadedItem` object that will contain the item's contents as `RawContent`, and it will also contain the asset property
that contains the information of the asset file.

An asset file is a JSON file that contains the item's information and it has the following shape:

```typescript
{
  // The item's id
  "id": "f12313b4-a76b-4c9e-a2a3-ab460f59bd67",
  // The item's name
  "name": "test",
  // The item's WearableCategory
  "category": "eyebrows",
  // The item's Rarity
  "rarity": "common",
  // The item's collection id (optional)
  "collectionId": "272233f5-e539-4202-b95c-aa68b0c8f190",
  // The item's description (optional)
  "description": "a description",
  // The WearableCategories that the item hides (optional)
  "hides": [],
  // The WearableCategories that the item replaces (optional)
  "replaces": [],
  // The item's tags (optional)
  "tags": ["special", "new", "eyebrows"],
  // The item's representations (the item must have more than one representation)
  "representations": [
    {
      // The body shapes that the representation will be used for (male/female/both)
      "bodyShape": "male",
      // The file path (path inside of the zipped file) to the main model of the representation
      "mainFile": "aModelFile.glb",
      // An array of file paths (paths inside the zipped file) to the files that the representation contains
      "contents": ["aModelFile.glb", "aTextureFile.png", "thumbnail.png"],
      // The representation's WearableCategories hides overrides
      "overrideHides": [],
      // The representation's WearableCategories replaces overrides
      "overrideReplaces": [],
      // The representation's metrics (optional, default metrics will be provided but it's recommended to include them)
      "metrics": {
        "triangles": 20,
        "materials": 1,
        "meshes": 10,
        "bodies": 2,
        "entities": 1,
        "textures": 1
      }
    }
  ]
}
```

After loading the file zip file that contains an `asset.json` file, the `LoadedItem` object can be used to create an item using the `ItemFactory`:

```typescript
const loadedItem = await loadItem('model-with-asset.zip')
const itemFactory = new ItemFactory()
itemFactory.fromAsset(loadedItem.asset)
```

**To consider**

The item's thumbnail must be set either manually, by using the factory's `withThumbnail` method or by including the file `thumbnail.png` in the item's contents.

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
await client.upsertItem(builtItem.item, builtItem.newContent)
```
