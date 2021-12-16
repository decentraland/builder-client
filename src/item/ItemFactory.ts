import { THUMBNAIL_PATH } from './constants'
import {
  computeHashes,
  prefixContentName,
  sortContent
} from '../content/content'
import { SortedContent } from '../content/types'
import {
  BodyShapeType,
  Item,
  ItemRarity,
  ItemType,
  WearableBodyShape,
  WearableCategory,
  WearableRepresentation
} from './types'

export class ItemFactory {
  private item: Item | null = null
  private newContent: Record<string, Blob> = {}
  private readonly NOT_INITIALIZED_ERROR = 'Item has not been initialized'

  constructor(item?: Item) {
    this.item = item ?? null
  }

  /**
   * Check that the given text won't break the item's metadata when used.
   * @param text - The text to verify that won't break the item's metadata.
   */
  private isMetadataTextValid(text: string): boolean {
    const invalidCharacters = [':']
    const invalidCharactersRegex = new RegExp(invalidCharacters.join('|'))
    return text.search(invalidCharactersRegex) === -1
  }

  /**
   * Builds an item's representation.
   * @param bodyShape - The body shape of the representation to build.
   * @param model - The name of the content's key that points to the model.
   * @param contents - The sorted contents of the representation to build.
   */
  private buildRepresentations(
    bodyShape: BodyShapeType,
    model: string,
    contents: SortedContent
  ): WearableRepresentation[] {
    const representations: WearableRepresentation[] = []

    // Add male representation
    if (bodyShape === BodyShapeType.MALE || bodyShape === BodyShapeType.BOTH) {
      representations.push({
        bodyShapes: [WearableBodyShape.MALE],
        mainFile: prefixContentName(BodyShapeType.MALE, model),
        contents: Object.keys(contents.male),
        overrideHides: [],
        overrideReplaces: []
      })
    }

    // Add female representation
    if (
      bodyShape === BodyShapeType.FEMALE ||
      bodyShape === BodyShapeType.BOTH
    ) {
      representations.push({
        bodyShapes: [WearableBodyShape.FEMALE],
        mainFile: prefixContentName(BodyShapeType.FEMALE, model),
        contents: Object.keys(contents.female),
        overrideHides: [],
        overrideReplaces: []
      })
    }

    return representations
  }

  /**
   * Checks if an item's representation would fit a specific body shape.
   * @param bodyShape - The body shape to check for.
   * @param representation - The representation to see if fits the body shape.
   */
  private representsBodyShape(
    bodyShape: BodyShapeType,
    representation: WearableRepresentation
  ): boolean {
    return (
      bodyShape === BodyShapeType.BOTH ||
      (bodyShape === BodyShapeType.MALE
        ? WearableBodyShape.MALE === representation.bodyShapes[0]
        : WearableBodyShape.FEMALE === representation.bodyShapes[0])
    )
  }

  /**
   * Builds a new record of contents without the contents of the specified body shape.
   * @param bodyShape - The body shape of the contents to be left out.
   * @param contents - The contents to be filtered taking into consideration the specified body shape.
   */
  private removeContentsOfBodyShape(
    bodyShape: BodyShapeType,
    contents: Record<string, any>
  ): Record<string, any> {
    return Object.keys(contents)
      .filter(
        (key) =>
          !(
            bodyShape === BodyShapeType.BOTH ||
            key.startsWith(bodyShape.toString())
          )
      )
      .reduce((accum, key) => {
        accum[key] = contents[key]
        return accum
      }, {} as Record<string, any>)
  }

  /**
   * Sets an item's property by checking first if the item is defined.
   * @param property - The property of the item to be set.
   * @param value - The value of the property to be set.
   */
  private setItemProperty<T extends keyof Item>(
    property: T,
    value: Item[T]
  ): ItemFactory {
    if (!this.item) {
      throw new Error(this.NOT_INITIALIZED_ERROR)
    }

    this.item = {
      ...this.item,
      [property]: value
    }
    return this
  }

  /**
   * Sets an item's property in the data section by checking first if the item is defined.
   * @param property - The property of the item to be set.
   * @param value - The value of the property to be set.
   */
  private setItemDataProperty<T extends keyof Item['data']>(
    property: T,
    value: Item['data'][T]
  ): ItemFactory {
    if (!this.item) {
      throw new Error(this.NOT_INITIALIZED_ERROR)
    }

    this.item = {
      ...this.item,
      data: {
        ...this.item.data,
        [property]: value
      }
    }
    return this
  }

  public newItem(
    id: string,
    name: string,
    rarity: ItemRarity,
    category: WearableCategory,
    owner: string,
    collectionId?: string,
    description?: string
  ) {
    if (
      !this.isMetadataTextValid(name) ||
      (description && !this.isMetadataTextValid(description))
    ) {
      throw new Error('Invalid item name or description')
    }

    this.item = {
      id,
      name,
      description: description || '',
      thumbnail: THUMBNAIL_PATH,
      type: ItemType.WEARABLE,
      collectionId,
      contentHash: null,
      rarity,
      owner,
      data: {
        category,
        replaces: [],
        hides: [],
        tags: [],
        representations: []
      },
      metrics: {
        triangles: 0,
        materials: 0,
        meshes: 0,
        bodies: 0,
        entities: 0,
        textures: 0
      },
      contents: {}
    }
    return this
  }

  /**
   * Sets or updates the item's id.
   * It requires the item to be defined first.
   * @param id - The item's id.
   */
  public withId(id: string): ItemFactory {
    return this.setItemProperty('id', id)
  }

  /**
   * Sets or updates the item's name.
   * It requires the item to be defined first.
   * @param name - The item's name.
   */
  public withName(name: string): ItemFactory {
    return this.setItemProperty('name', name)
  }

  /**
   * Sets or updates the item's description.
   * It requires the item to be defined first.
   * @param description - The item's description.
   */
  public withDescription(description: string): ItemFactory {
    return this.setItemProperty('description', description)
  }

  /**
   * Sets or updates the item's replaces property.
   * It requires the item to be defined first.
   * @param replaces - The item's replaces property.
   */
  public withReplaces(replaces: WearableCategory[]): ItemFactory {
    return this.setItemDataProperty('replaces', replaces)
  }

  /**
   * Sets or updates the item's rarity.
   * It requires the item to be defined first.
   * @param rarity - The item's rarity.
   */
  public withRarity(rarity: ItemRarity): ItemFactory {
    return this.setItemProperty('rarity', rarity)
  }

  /**
   * Sets or updates the item's collectionId.
   * It requires the item to be defined first.
   * @param collectionId - The item's collectionId.
   */
  public withCollectionId(collectionId: string): ItemFactory {
    return this.setItemProperty('collectionId', collectionId)
  }

  /**
   * Sets or updates the item's owner.
   * It requires the item to be defined first.
   * @param owner - The item's owner.
   */
  public withOwner(owner: string): ItemFactory {
    return this.setItemProperty('owner', owner)
  }

  /**
   * Sets or updates the item's category.
   * It requires the item to be defined first.
   * @param category - The item's category.
   */
  public withCategory(category: WearableCategory): ItemFactory {
    return this.setItemDataProperty('category', category)
  }

  /**
   * Sets or updates the item's hides property.
   * It requires the item to be defined first.
   * @param hides - The item's hides property.
   */
  public withHides(hides: WearableCategory[]): ItemFactory {
    return this.setItemDataProperty('hides', hides)
  }

  /**
   * Sets or updates the item's tags property.
   * It requires the item to be defined first.
   * @param tags - The item's tags property.
   */
  public withTags(tags: string[]): ItemFactory {
    return this.setItemDataProperty('tags', tags)
  }

  /**
   * Adds a new a representation and its contents to the item, taking into consideration the specified body shape.
   * If BOTH is used as the body shape, both representations, female and male will be added.
   * It requires the item to be defined first.
   * @param bodyShape - The body shape that the new representation will represent.
   * @param model - The name of the content's key that points to the model to be used to build the new representation.
   * @param contents - The contents of the representation to be used to build the new representation.
   */
  public withRepresentationContent(
    bodyShape: BodyShapeType,
    model: string,
    contents: Record<string, Blob>
  ) {
    if (!this.item) {
      throw new Error(this.NOT_INITIALIZED_ERROR)
    }

    const representationAlreadyExists = this.item.data.representations.some(
      (representation) => this.representsBodyShape(bodyShape, representation)
    )

    if (representationAlreadyExists) {
      throw new Error(
        "The representation that you're about to add already exists in the item"
      )
    }

    const sortedContents = sortContent(bodyShape, contents)

    this.newContent = {
      ...this.newContent,
      // TODO: these should be the sorted contents
      ...contents
    }

    this.item = {
      ...this.item,
      data: {
        ...this.item.data,
        representations: [
          ...this.item.data.representations,
          // TODO: we should take into consideration the sorting
          ...this.buildRepresentations(bodyShape, model, sortedContents)
        ],
        replaces: [...this.item.data.replaces],
        hides: [...this.item.data.hides],
        tags: [...this.item.data.tags]
      }
      // TODO: where will the metrics come from? Should we compute them at the end?
    }
    return this
  }

  /**
   * Removes a representation and its contents from the item, taking into consideration the specified body shape.
   * If BOTH is used as the body shape, all the representations will be removed.
   * It requires the item to be defined first.
   * @param bodyShape - The body shape that will be used to identify the representation to remove.
   */
  public withoutRepresentation(bodyShape: BodyShapeType) {
    if (!this.item) {
      throw new Error(this.NOT_INITIALIZED_ERROR)
    }

    this.newContent = this.removeContentsOfBodyShape(bodyShape, this.newContent)

    this.item = {
      ...this.item,

      data: {
        ...this.item.data,
        representations: this.item.data.representations.filter(
          (representation) =>
            !this.representsBodyShape(bodyShape, representation)
        )
      },

      contents: {
        ...this.item.contents,
        ...this.removeContentsOfBodyShape(bodyShape, this.item.contents)
      }
    }
    return this
  }

  /**
   * Replaces a representation and its contents from the item, taking into consideration the specified body shape.
   * If BOTH is used as the body shape, all representations will be replaced with one for both male and female.
   * It requires the item to be defined first.
   * @param bodyShape - The body shape that will be used to identify the representation to replace.
   * @param model - The name of the content's key that points to the model to be used to replace the one with the specified body shape.
   * @param contents - The contents of the representation to be used to replace the one with the specified body shape.
   */
  public replacingRepresentation(
    bodyShape: BodyShapeType,
    model: string,
    contents: Record<string, Blob>
  ): ItemFactory {
    if (!this.item) {
      throw new Error(this.NOT_INITIALIZED_ERROR)
    }
    // TODO: Is it needed to sort by all? I don't think so,
    const sortedContents = sortContent(bodyShape, contents)

    this.newContent = {
      ...this.removeContentsOfBodyShape(bodyShape, this.newContent),
      // TODO: these should be the sorted contents
      ...contents
    }

    this.item = {
      ...this.item,
      data: {
        ...this.item.data,
        representations: [
          ...this.item.data.representations.filter(
            (representation) =>
              !this.representsBodyShape(bodyShape, representation)
          ),
          // TODO: Take into consideration the sorting for the model name
          ...this.buildRepresentations(bodyShape, model, sortedContents)
        ],
        replaces: [...this.item.data.replaces],
        hides: [...this.item.data.hides],
        tags: [...this.item.data.tags]
      },
      // TODO: where will the metrics come from? Should we compute them at the end?
      // metrics,
      contents: {
        ...this.removeContentsOfBodyShape(bodyShape, this.item.contents)
      }
    }

    return this
  }

  async create() {
    if (!this.item) {
      throw new Error('The item must be set before creating it')
    }

    // Compute hashes at the end or receive them computed?
    return {
      ...this.item,
      contents: {
        ...this.item.contents,
        ...(await computeHashes(this.newContent))
      }
    }
  }

  // Creating a new item from a zip that contains an assetJson.
  // The assetJSON file should be enhanced to support multiple models.
  // fromFile(fileName: string, file: ArrayBuffer): ItemFactory {
  //   const loadFile = await this.handleFile(file)
  //   const { thumbnail, model, metrics, contents, assetJson } = loadFile

  //   this.newItem(
  //     assetJson.id,
  //     assetJson.name,
  //     'collectionID',
  //     assetJson.rarity,
  //     assetJson.category,
  //     assetJson.description
  //   )

  //   assetJson.representations.forEach((representation: any) => {
  //     // Each representation should have its contents.
  //     this.withRepresentation(bodyShape, model, contents)
  //   })

  //   return this
  // }

  // async withRepresentationFile(
  //   bodyShape: BodyShapeType,
  //   fileName: string,
  //   file: ArrayBuffer
  // ) {
  //   const loadFile = await handleItemFile(fileName, file)
  //   const { model, contents } = loadFile
  //   return this.withRepresentationContent(bodyShape, model, contents)
  // }
}

// Item object

// Item Factory
// 1. Start the creation of a new item
// 2. Add representation
// 3. Create item
// From ZIP file

// API
// - Upsert Item
// - Create collection ?
// - Publish collection ?

// Tasks:
// - Build the item factory
//   - Add the simple create item function and test it -> 1
//   - Add the with representation and without representation functions and test them -> 2
//   - Add the replacingRepresentation function and test it -> 1
//   - Write the file handling functions (the thumbnail and file processing too) and test them -> 2
//   - Add the create and setter functions (withId, withName) and test them -> 1
// 1/2 days

// Builder API
// - Add the upsert item function and test it -> 2
// - Use the Factory and the API in the UI -> 3
// 2/3 days moving using it to the UI

// Others
// - Create a new enhanced asset json file from which to load everything into (representations & stuff) -> 2/3
// X - Add a check for the the name and the description in the builder server -> 1
// X - Move the created and updated at to the builder -> 1
// - Remove the properties that come from the catalyst -> 1
// - Create an endpoint to ask for the content file header (investigate a possible redirection) to get the file sizes -> 2 (maybe not)

// const itemFactory = new ItemFactory()
// const newContent = itemFactory.getNewContent()

// const item = await (new ItemFactory().fromFile(file).create())
// await BuilderAPI.upsertItem(item, itemFactory)

// new ItemFactory().newItem(...).withRepresentation().withRepresentation()

// new ItemFactory(item).withoutRepresentation().withRepresentation().create()
