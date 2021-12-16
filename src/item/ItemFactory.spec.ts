import { Rarity } from '@dcl/schemas'
import { capitalize } from '../test-utils/string'
import { ItemFactory } from './ItemFactory'
import { LocalItem, WearableCategory } from './types'

let itemFactory: ItemFactory

const createBasicItem = (itemFactory: ItemFactory): ItemFactory => {
  return itemFactory.newItem(
    'anId',
    'aName',
    Rarity.COMMON,
    WearableCategory.EYEBROWS,
    '0x00',
    'aCollectionId',
    'aDescription'
  )
}

const testPropertyBuilder = <T extends keyof LocalItem>(
  property: T,
  value: LocalItem[T]
) => {
  const capitalizedProperty = capitalize(property)
  let factory: ItemFactory

  describe(`when updating the item's ${property}`, () => {
    beforeEach(() => {
      factory = new ItemFactory()
    })

    describe("and the item hasn't been initialized", () => {
      it('should throw an error signaling that the item has not been initialized', () => {
        expect(() => factory[`with${capitalizedProperty}`](value)).toThrow(
          'Item has not been initialized'
        )
      })
    })

    describe('and the item has been initialized', () => {
      beforeEach(async () => {
        createBasicItem(factory)
      })

      it('should build an item with the updated id', () => {
        factory[`with${capitalizedProperty}`](value)
        return expect(factory.create()).resolves.toEqual(
          expect.objectContaining({ [property]: value })
        )
      })
    })
  })
}

const testDataPropertyBuilder = <T extends keyof LocalItem['data']>(
  property: T,
  value: LocalItem['data'][T]
) => {
  const capitalizedProperty = capitalize(property)
  let factory: ItemFactory

  describe(`when updating the item's ${property}`, () => {
    beforeEach(() => {
      factory = new ItemFactory()
    })

    describe("and the item hasn't been initialized", () => {
      it('should throw an error signaling that the item has not been initialized', () => {
        expect(() => factory[`with${capitalizedProperty}`](value)).toThrow(
          'Item has not been initialized'
        )
      })
    })

    describe('and the item has been initialized', () => {
      beforeEach(async () => {
        createBasicItem(factory)
      })

      it('should build an item with the updated id', () => {
        factory[`with${capitalizedProperty}`](value)
        return expect(factory.create()).resolves.toEqual(
          expect.objectContaining({
            data: expect.objectContaining({ [property]: value })
          })
        )
      })
    })
  })
}

beforeEach(() => {
  itemFactory = new ItemFactory()
})

describe('when creating a new item', () => {
  let item: LocalItem

  beforeEach(async () => {
    createBasicItem(itemFactory)
    item = await itemFactory.create()
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

  it('should have its owner set', () => {
    expect(item.eth_address).toBe('0x00')
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

testPropertyBuilder('id', 'anotherId')

testPropertyBuilder('name', 'anotherName')

testPropertyBuilder('description', 'anotherDescription')

testPropertyBuilder('rarity', Rarity.UNIQUE)

testPropertyBuilder('collection_id', 'anotherCollectionId')

testPropertyBuilder('eth_address', '0x1111')

testDataPropertyBuilder('category', WearableCategory.HAT)

testDataPropertyBuilder('hides', [WearableCategory.HAT])

testDataPropertyBuilder('tags', [WearableCategory.HAT])
