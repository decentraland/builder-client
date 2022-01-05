import { Rarity, WearableRepresentation } from '@dcl/schemas'
import { prefixContentName } from '../content/content'
import { AssetJSON } from '../files/types'
import { toCamelCase } from '../test-utils/string'
import { THUMBNAIL_PATH } from './constants'
import { ItemFactory } from './ItemFactory'
import {
  BodyShapeType,
  ItemType,
  LocalItem,
  ModelMetrics,
  WearableBodyShape,
  WearableCategory
} from './types'

const createBasicItem = (
  itemFactory: ItemFactory<Uint8Array>
): ItemFactory<Uint8Array> => {
  return itemFactory.newItem(
    'anId',
    'aName',
    Rarity.COMMON,
    WearableCategory.EYEBROWS,
    'aCollectionId',
    'aDescription'
  )
}

const testPropertyBuilder = <T extends keyof LocalItem>(
  property: T,
  value: LocalItem[T]
) => {
  const camelCasedProperty = toCamelCase(property)
  let factory: ItemFactory<Uint8Array>

  describe(`when updating the item's ${property}`, () => {
    beforeEach(() => {
      factory = new ItemFactory()
    })

    describe("and the item hasn't been initialized", () => {
      it('should throw an error signaling that the item has not been initialized', () => {
        expect(() => factory[`with${camelCasedProperty}`](value)).toThrow(
          'Item has not been initialized'
        )
      })
    })

    describe('and the item has been initialized', () => {
      beforeEach(async () => {
        createBasicItem(factory)
      })

      it(`should build an item with the updated ${property}`, () => {
        factory[`with${camelCasedProperty}`](value)
        return expect(factory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({ [property]: value })
          })
        )
      })
    })
  })
}

const testDataPropertyBuilder = <T extends keyof LocalItem['data']>(
  property: T,
  value: LocalItem['data'][T]
) => {
  const camelCasedProperty = toCamelCase(property)
  let factory: ItemFactory<Uint8Array>

  describe(`when updating the item's ${property}`, () => {
    beforeEach(() => {
      factory = new ItemFactory()
    })

    describe("and the item hasn't been initialized", () => {
      it('should throw an error signaling that the item has not been initialized', () => {
        expect(() => factory[`with${camelCasedProperty}`](value)).toThrow(
          'Item has not been initialized'
        )
      })
    })

    describe('and the item has been initialized', () => {
      beforeEach(async () => {
        createBasicItem(factory)
      })

      it('should build an item with the updated id', () => {
        factory[`with${camelCasedProperty}`](value)
        return expect(factory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              data: expect.objectContaining({ [property]: value })
            })
          })
        )
      })
    })
  })
}

const modelPath = 'model.glb'
let itemFactory: ItemFactory<Uint8Array>
let item: LocalItem
let newContent: Record<string, Uint8Array>
let prefixedMaleModel: string
let prefixedFemaleModel: string
let contents: Record<string, Uint8Array>
let maleHashedContent: Record<string, string>
let femaleHashedContent: Record<string, string>
let metrics: ModelMetrics
let maleRepresentation: WearableRepresentation
let femaleRepresentation: WearableRepresentation

beforeEach(() => {
  prefixedMaleModel = prefixContentName(BodyShapeType.MALE, modelPath)
  prefixedFemaleModel = prefixContentName(BodyShapeType.FEMALE, modelPath)
  itemFactory = new ItemFactory()
  contents = {
    [modelPath]: new Uint8Array([1, 2, 3]),
    [THUMBNAIL_PATH]: new Uint8Array([4, 5, 6])
  }
  maleHashedContent = {
    [THUMBNAIL_PATH]:
      'bafkreidypr4y4onfxqmrank3vzwqzwd2g2zocd6qeavihy53nmaf3kbuoi',
    [prefixedMaleModel]:
      'bafkreiadsbmmn4waznesyuz3bjgrj33xzqhxrk6mz3ksq7meugrachh3qe'
  }
  femaleHashedContent = {
    [THUMBNAIL_PATH]:
      'bafkreidypr4y4onfxqmrank3vzwqzwd2g2zocd6qeavihy53nmaf3kbuoi',
    [prefixedFemaleModel]:
      'bafkreiadsbmmn4waznesyuz3bjgrj33xzqhxrk6mz3ksq7meugrachh3qe'
  }
  maleRepresentation = {
    bodyShapes: [WearableBodyShape.MALE],
    mainFile: prefixedMaleModel,
    contents: [prefixedMaleModel],
    overrideReplaces: [],
    overrideHides: []
  }
  femaleRepresentation = {
    bodyShapes: [WearableBodyShape.FEMALE],
    mainFile: prefixedFemaleModel,
    contents: [prefixedFemaleModel],
    overrideReplaces: [],
    overrideHides: []
  }
  metrics = {
    triangles: 100,
    materials: 101,
    meshes: 102,
    bodies: 103,
    entities: 104,
    textures: 105
  }
})

describe('when creating a new item', () => {
  let item: LocalItem

  beforeEach(async () => {
    createBasicItem(itemFactory)
    item = (await itemFactory.build()).item
  })

  it('should have its ID set', () => {
    expect(item.id).toBe('anId')
  })

  it('should have its name set', () => {
    expect(item.name).toBe('aName')
  })

  it('should have its rarity set', () => {
    expect(item.rarity).toBe(Rarity.COMMON)
  })

  it('should have its category set', () => {
    expect(item.data.category).toBe(WearableCategory.EYEBROWS)
  })

  it('should have its collection ID set', () => {
    expect(item.collection_id).toBe('aCollectionId')
  })

  it('should have its description set', () => {
    expect(item.description).toBe('aDescription')
  })

  it('should have its contents set as an empty record', () => {
    expect(item.contents).toEqual({})
  })

  it('should have its metrics set as 0', () => {
    expect(item.metrics).toEqual({
      triangles: 0,
      materials: 0,
      meshes: 0,
      bodies: 0,
      entities: 0,
      textures: 0
    })
  })

  it('should have its replaces, hides, tags and representations set as empty arrays', () => {
    expect(item.data).toEqual(
      expect.objectContaining({
        replaces: [],
        hides: [],
        tags: [],
        representations: []
      })
    )
  })
})

describe('when adding a representation to an item', () => {
  let anotherMetrics: ModelMetrics

  beforeEach(() => {
    anotherMetrics = {
      triangles: 106,
      materials: 107,
      meshes: 108,
      bodies: 109,
      entities: 110,
      textures: 111
    }
  })

  describe('and the item was not initialized', () => {
    it('should throw an error signaling that the item has not been initialized', () => {
      expect(() =>
        itemFactory.withRepresentation(
          BodyShapeType.MALE,
          modelPath,
          contents,
          metrics
        )
      ).toThrow('Item has not been initialized')
    })
  })

  describe('and the item is already initialized', () => {
    beforeEach(() => {
      createBasicItem(itemFactory)
    })

    describe('and the representation is for a male body shape', () => {
      describe('and the item already contained a male representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.MALE,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.MALE,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item already contained a female representation', () => {
        beforeEach(async () => {
          itemFactory.withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )

          itemFactory.withRepresentation(
            BodyShapeType.MALE,
            modelPath,
            contents,
            anotherMetrics
          )
          const createdItem = await itemFactory.build()
          newContent = createdItem.newContent
          item = createdItem.item
        })

        it('should have created the male representation and added it to the representations', () => {
          expect(item.data.representations).toEqual([
            femaleRepresentation,
            maleRepresentation
          ])
        })

        it('should have set the new metrics', () => {
          expect(item.metrics).toEqual(anotherMetrics)
        })

        it("should have added the male contents to the item's contents", () => {
          expect(item).toEqual(
            expect.objectContaining({
              contents: { ...femaleHashedContent, ...maleHashedContent }
            })
          )
        })

        it('should have added the male contents to the new contents', () => {
          expect(newContent).toEqual({
            [prefixedFemaleModel]: contents[modelPath],
            [prefixedMaleModel]: contents[modelPath],
            [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
          })
        })
      })

      describe('and the item already contained a "both" representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.BOTH,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.MALE,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item did not contain a male nor a "both" representation', () => {
        beforeEach(async () => {
          itemFactory.withRepresentation(
            BodyShapeType.MALE,
            modelPath,
            contents,
            metrics
          )
          const createdItem = await itemFactory.build()
          newContent = createdItem.newContent
          item = createdItem.item
        })

        it('should have created the male representation', () => {
          expect(item.data.representations).toEqual([maleRepresentation])
        })

        it('should have set the metrics', () => {
          expect(item.metrics).toEqual(metrics)
        })

        it("should have added the contents to the item's contents", () => {
          expect(item).toEqual(
            expect.objectContaining({
              contents: maleHashedContent
            })
          )
        })

        it('should have added the contents to the new contents', () => {
          expect(newContent).toEqual({
            [prefixedMaleModel]: contents[modelPath],
            [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
          })
        })
      })
    })

    describe('and the representation is for a female body shape', () => {
      describe('and the item already contained a female representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.FEMALE,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item already contained a "both" representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.BOTH,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.FEMALE,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item already contained a male representation', () => {
        beforeEach(async () => {
          itemFactory.withRepresentation(
            BodyShapeType.MALE,
            modelPath,
            contents,
            metrics
          )

          itemFactory.withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            anotherMetrics
          )
          const createdItem = await itemFactory.build()
          newContent = createdItem.newContent
          item = createdItem.item
        })

        it('should have created the female representation and added it to the representations', () => {
          expect(item.data.representations).toEqual([
            maleRepresentation,
            femaleRepresentation
          ])
        })

        it('should have set the new metrics', () => {
          expect(item.metrics).toEqual(anotherMetrics)
        })

        it("should have added the female contents to the item's contents", () => {
          expect(item).toEqual(
            expect.objectContaining({
              contents: { ...maleHashedContent, ...femaleHashedContent }
            })
          )
        })

        it('should have added the female contents to the new contents', () => {
          expect(newContent).toEqual({
            [prefixedMaleModel]: contents[modelPath],
            [prefixedFemaleModel]: contents[modelPath],
            [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
          })
        })
      })

      describe('and the item did not contain a female nor a "both" representation', () => {
        beforeEach(async () => {
          itemFactory.withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
          const createdItem = await itemFactory.build()
          newContent = createdItem.newContent
          item = createdItem.item
        })

        it('should have created the male representation', () => {
          expect(item.data.representations).toEqual([femaleRepresentation])
        })

        it('should have set the given metrics', () => {
          expect(item.metrics).toEqual(metrics)
        })

        it("should have added the contents to the item's contents", () => {
          expect(item).toEqual(
            expect.objectContaining({
              contents: femaleHashedContent
            })
          )
        })

        it('should have added the contents to the new contents', () => {
          expect(newContent).toEqual({
            [prefixedFemaleModel]: contents[modelPath],
            [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
          })
        })
      })
    })

    describe('and the representation is for a male and female body shapes', () => {
      describe('and the item already contained a female representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.BOTH,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item already contained a male representation', () => {
        beforeEach(() => {
          itemFactory.withRepresentation(
            BodyShapeType.MALE,
            modelPath,
            contents,
            metrics
          )
        })

        it('should throw an error signaling that the item already contained that body shape', () => {
          expect(() =>
            itemFactory.withRepresentation(
              BodyShapeType.BOTH,
              modelPath,
              contents,
              metrics
            )
          ).toThrow(
            "The representation that you're about to add already exists in the item"
          )
        })
      })

      describe('and the item did not contain any representation', () => {
        beforeEach(async () => {
          itemFactory.withRepresentation(
            BodyShapeType.BOTH,
            modelPath,
            contents,
            metrics
          )
          const createdItem = await itemFactory.build()
          newContent = createdItem.newContent
          item = createdItem.item
        })

        it('should have created the male representation', () => {
          expect(item.data.representations).toEqual([
            maleRepresentation,
            femaleRepresentation
          ])
        })

        it('should have set the given metrics', () => {
          expect(item.metrics).toEqual(metrics)
        })

        it("should have added the contents to the item's contents", () => {
          expect(item).toEqual(
            expect.objectContaining({
              contents: { ...maleHashedContent, ...femaleHashedContent }
            })
          )
        })

        it('should have added the contents to the new contents', () => {
          expect(newContent).toEqual({
            [prefixedMaleModel]: contents[modelPath],
            [prefixedFemaleModel]: contents[modelPath],
            [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
          })
        })
      })
    })
  })
})

describe('when removing a representation', () => {
  describe('and the item was not initialized', () => {
    it('should throw an error signaling that the item has not been initialized', () => {
      expect(() =>
        itemFactory.withoutRepresentation(BodyShapeType.MALE)
      ).toThrow('Item has not been initialized')
    })
  })

  describe('and the item is already initialized', () => {
    describe("and the item doesn't have any representations", () => {
      beforeEach(async () => {
        createBasicItem(itemFactory)
        itemFactory.withoutRepresentation(BodyShapeType.MALE)
      })

      it('should not do anything', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              data: expect.objectContaining({ representations: [] })
            })
          })
        )
      })
    })

    describe('and the body shape to remove is both', () => {
      beforeEach(() => {
        createBasicItem(itemFactory)
        itemFactory
          .withRepresentation(BodyShapeType.MALE, modelPath, contents, metrics)
          .withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
          .withoutRepresentation(BodyShapeType.BOTH)
      })

      it('should remove all representations', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              data: expect.objectContaining({ representations: [] })
            })
          })
        )
      })

      it('should remove all contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              contents: {}
            })
          })
        )
      })

      it('should remove all new contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            newContent: {}
          })
        )
      })
    })

    describe('and the body shape to remove is female, having a female and male representations', () => {
      beforeEach(() => {
        createBasicItem(itemFactory)
        itemFactory
          .withRepresentation(BodyShapeType.MALE, modelPath, contents, metrics)
          .withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
          .withoutRepresentation(BodyShapeType.FEMALE)
      })

      it('should remove the female representations', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              data: expect.objectContaining({
                representations: [maleRepresentation]
              })
            })
          })
        )
      })

      it('should remove the female contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              contents: maleHashedContent
            })
          })
        )
      })

      it('should remove the female new contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            newContent: {
              [prefixedMaleModel]: contents[modelPath],
              [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
            }
          })
        )
      })
    })

    describe('and the body shape to remove is male, having a female and male representations', () => {
      beforeEach(() => {
        createBasicItem(itemFactory)
        itemFactory
          .withRepresentation(
            BodyShapeType.FEMALE,
            modelPath,
            contents,
            metrics
          )
          .withRepresentation(BodyShapeType.MALE, modelPath, contents, metrics)
          .withoutRepresentation(BodyShapeType.MALE)
      })

      it('should remove the female representations', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              data: expect.objectContaining({
                representations: [femaleRepresentation]
              })
            })
          })
        )
      })

      it('should remove the female contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              contents: femaleHashedContent
            })
          })
        )
      })

      it('should remove the female new contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            newContent: {
              [prefixedFemaleModel]: contents[modelPath],
              [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
            }
          })
        )
      })
    })
  })
})

describe("when setting the item's thumbnail", () => {
  describe('and the item was not initialized', () => {
    it('should throw an error signaling that the item has not been initialized', () => {
      expect(() =>
        itemFactory.withoutRepresentation(BodyShapeType.MALE)
      ).toThrow('Item has not been initialized')
    })
  })

  describe('and the item is already initialized', () => {
    beforeEach(() => {
      createBasicItem(itemFactory)
    })

    describe('and the item already contained a thumbnail', () => {
      let newThumbnail: Uint8Array
      let newThumbnailHash: string

      beforeEach(() => {
        newThumbnail = new Uint8Array([11, 12, 13])
        newThumbnailHash =
          'bafkreigj4dzk52sis4yszi77peaijhoo5pmbvdww33byqkku62u2apv5e4'
        itemFactory.withRepresentation(
          BodyShapeType.MALE,
          modelPath,
          contents,
          metrics
        )
        itemFactory.withThumbnail(newThumbnail)
      })

      it('should have set the new thumbnail in the contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              contents: expect.objectContaining({
                [THUMBNAIL_PATH]: newThumbnailHash
              })
            })
          })
        )
      })

      it('should have set the new thumbnail in the new contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            newContent: expect.objectContaining({
              [THUMBNAIL_PATH]: newThumbnail
            })
          })
        )
      })
    })

    describe("and the item didn't contain a thumbnail", () => {
      beforeEach(() => {
        itemFactory.withThumbnail(contents[THUMBNAIL_PATH])
      })

      it('should have set the new thumbnail in the contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            item: expect.objectContaining({
              contents: expect.objectContaining({
                [THUMBNAIL_PATH]: maleHashedContent[THUMBNAIL_PATH]
              })
            })
          })
        )
      })

      it('should have set the new thumbnail in the new contents', () => {
        return expect(itemFactory.build()).resolves.toEqual(
          expect.objectContaining({
            newContent: expect.objectContaining({
              [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
            })
          })
        )
      })
    })
  })
})

describe('when creating a new item from an asset object', () => {
  let asset: AssetJSON

  beforeEach(async () => {
    asset = {
      id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
      name: 'test',
      category: WearableCategory.EYEBROWS,
      rarity: Rarity.COMMON,
      collectionId: '7c3af3a0-9ea9-4cc7-a137-dc1f1f6c0871',
      description: 'a description',
      hides: [WearableCategory.FEET],
      replaces: [WearableCategory.HAIR],
      tags: ['tag1', 'tag2'],
      representations: [
        {
          bodyShape: BodyShapeType.MALE,
          mainFile: modelPath,
          contents: [modelPath, THUMBNAIL_PATH],
          overrideHides: [WearableCategory.EYES],
          overrideReplaces: [WearableCategory.FACIAL_HAIR],
          metrics
        }
      ]
    }
    itemFactory.fromAsset(asset, contents)
  })

  it('should create the built item configured with the values from the asset object and the new content with the provided content', () => {
    return expect(itemFactory.build()).resolves.toEqual({
      item: {
        id: asset.id,
        name: asset.name,
        type: ItemType.WEARABLE,
        thumbnail: THUMBNAIL_PATH,
        collection_id: asset.collectionId,
        urn: null,
        data: {
          category: asset.category,
          hides: asset.hides,
          replaces: asset.replaces,
          tags: asset.tags,
          representations: [
            {
              bodyShapes: [WearableBodyShape.MALE],
              contents: [prefixedMaleModel],
              mainFile: prefixedMaleModel,
              overrideHides: [WearableCategory.EYES],
              overrideReplaces: [WearableCategory.FACIAL_HAIR]
            }
          ]
        },
        rarity: asset.rarity,
        description: asset.description,
        metrics: asset.representations[0].metrics,
        contents: maleHashedContent,
        content_hash: null
      } as LocalItem,
      newContent: {
        [prefixedMaleModel]: contents[modelPath],
        [THUMBNAIL_PATH]: contents[THUMBNAIL_PATH]
      }
    })
  })
})

testPropertyBuilder('id', 'anotherId')

testPropertyBuilder('name', 'anotherName')

testPropertyBuilder('description', 'anotherDescription')

testPropertyBuilder('rarity', Rarity.UNIQUE)

testPropertyBuilder('collection_id', 'anotherCollectionId')

testDataPropertyBuilder('category', WearableCategory.HAT)

testDataPropertyBuilder('hides', [WearableCategory.HAT])

testDataPropertyBuilder('tags', [WearableCategory.HAT])
