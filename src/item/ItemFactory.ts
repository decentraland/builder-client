import { Rarity, WearableRepresentation } from '@dcl/schemas'
import { v4 as uuidV4 } from 'uuid'
import {
  computeHashes,
  prefixContentName,
  sortContent
} from '../content/content'
import { Content, RawContent, SortedContent } from '../content/types'
import { BuilderConfig, WearableConfig } from '../files/types'
import { DEFAULT_METRICS, IMAGE_PATH, THUMBNAIL_PATH } from './constants'
import { ItemNotInitializedError } from './ItemFactory.errors'
import {
  BasicItem,
  BuiltItem,
  ItemType,
  LocalItem,
  WearableBodyShape,
  WearableCategory
} from './types'

export class ItemFactory<X extends Content> {
  private newContent: RawContent<X> = {}

  constructor(private item: LocalItem | null = null) {}

  /**
   * Instantiates a new item with the base properties.
   * @param BasicItem - The set of properties that, without a representation, defines an item.
   */
  public newItem({
    id,
    name,
    rarity,
    category,
    collection_id,
    description,
    urn
  }: BasicItem) {
    if (
      !this.isMetadataTextValid(name) ||
      (description && !this.isMetadataTextValid(description))
    ) {
      throw new Error('Invalid item name or description')
    }

    this.item = {
      id: id ?? uuidV4(),
      name,
      description: description || '',
      thumbnail: THUMBNAIL_PATH,
      type: ItemType.WEARABLE,
      collection_id: collection_id ?? null,
      content_hash: null,
      rarity,
      urn: urn ?? null,
      data: {
        category,
        replaces: [],
        hides: [],
        tags: [],
        representations: []
      },
      metrics: DEFAULT_METRICS,
      contents: {}
    }
    return this
  }

  /**
   * Instantiates a new item with the base properties.
   * @param wearableConfig - The AssetJSON object containing all the information about the item.
   * @param contents - The item's content.
   */
  public fromConfig(
    wearableConfig: WearableConfig,
    content: RawContent<X>,
    builderConfig?: BuilderConfig
  ): ItemFactory<X> {
    this.newItem({
      id: builderConfig?.id ?? uuidV4(),
      name: wearableConfig.name,
      rarity: wearableConfig.rarity ?? null,
      category: wearableConfig.data.category,
      collection_id: builderConfig?.collectionId ?? null,
      description: wearableConfig.description ?? null,
      urn: wearableConfig.id ?? null
    })

    if (content[THUMBNAIL_PATH]) {
      this.withThumbnail(content[THUMBNAIL_PATH])
    }

    if (wearableConfig.data.replaces) {
      this.withReplaces(wearableConfig.data.replaces)
    }

    if (wearableConfig.data.hides) {
      this.withHides(wearableConfig.data.hides)
    }

    if (wearableConfig.data.tags) {
      this.withTags(wearableConfig.data.tags)
    }

    wearableConfig.data.representations.forEach((representation) => {
      representation.bodyShapes.forEach((bodyShape) => {
        this.withRepresentation(
          bodyShape,
          representation.mainFile,
          this.buildWearableConfigRepresentationContents(
            content,
            representation.contents
          ),
          representation.overrideHides,
          representation.overrideReplaces
        )
      })
    })

    return this
  }

  /**
   * Sets or updates the item's id.
   * It requires the item to be defined first.
   * @param id - The item's id.
   */
  public withId(id: string): ItemFactory<X> {
    return this.setItemProperty('id', id)
  }

  /**
   * Sets or updates the item's name.
   * It requires the item to be defined first.
   * @param name - The item's name.
   */
  public withName(name: string): ItemFactory<X> {
    return this.setItemProperty('name', name)
  }

  /**
   * Sets or updates the item's description.
   * It requires the item to be defined first.
   * @param description - The item's description.
   */
  public withDescription(description: string): ItemFactory<X> {
    return this.setItemProperty('description', description)
  }

  /**
   * Sets or updates the item's replaces property.
   * It requires the item to be defined first.
   * @param replaces - The item's replaces property.
   */
  public withReplaces(replaces: WearableCategory[]): ItemFactory<X> {
    return this.setItemDataProperty('replaces', replaces)
  }

  /**
   * Sets or updates the item's rarity.
   * It requires the item to be defined first.
   * @param rarity - The item's rarity.
   */
  public withRarity(rarity: Rarity): ItemFactory<X> {
    return this.setItemProperty('rarity', rarity)
  }

  /**
   * Sets or updates the item's collectionId.
   * It requires the item to be defined first.
   * @param collectionId - The item's collectionId.
   */
  public withCollectionId(collectionId: string): ItemFactory<X> {
    return this.setItemProperty('collection_id', collectionId)
  }

  /**
   * Sets or updates the item's category.
   * It requires the item to be defined first.
   * @param category - The item's category.
   */
  public withCategory(category: WearableCategory): ItemFactory<X> {
    return this.setItemDataProperty('category', category)
  }

  /**
   * Sets or updates the item's hides property.
   * It requires the item to be defined first.
   * @param hides - The item's hides property.
   */
  public withHides(hides: WearableCategory[]): ItemFactory<X> {
    return this.setItemDataProperty('hides', hides)
  }

  /**
   * Sets or updates the item's tags property.
   * It requires the item to be defined first.
   * @param tags - The item's tags property.
   */
  public withTags(tags: string[]): ItemFactory<X> {
    return this.setItemDataProperty('tags', tags)
  }

  /**
   * Sets or updates the item's urn property.
   * It requires the item to be defined first.
   * @param urn - The item's urn property.
   */
  public withUrn(urn: string): ItemFactory<X> {
    return this.setItemProperty('urn', urn)
  }

  /**
   * Sets or updates the item's thumbnail.
   * It requires the item to be defined first.
   * @param thumbnail - The item's thumbnail.
   */
  public withThumbnail(thumbnail: X): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
    }

    this.newContent = {
      ...this.newContent,
      [THUMBNAIL_PATH]: thumbnail
    }
    delete this.item.contents[THUMBNAIL_PATH]

    return this
  }

  /**
   * Sets or updates the item's content.
   * It requires the item to be defined first.
   * @param content - The item's new content
   */
  public withContent(content: Record<string, X>): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
    }

    this.newContent = {
      ...this.newContent,
      ...content
    }
    for (const key in content) {
      delete this.item.contents[key]
    }

    return this
  }

  /**
   * Sets or updates the item's image.
   * The image will be used at the deployment process
   * to be uploaded to the catalyst.
   * It requires the item to be defined first.
   * @param thumbnail - The item's thumbnail.
   */
  public withImage(image: X): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
    }

    this.newContent = {
      ...this.newContent,
      [IMAGE_PATH]: image
    }
    delete this.item.contents[IMAGE_PATH]

    return this
  }

  /**
   * Adds a new a representation and its contents to the item, taking into consideration the specified body shape.
   * If BOTH is used as the body shape, both representations, female and male will be added.
   * It requires the item to be defined first.
   * @param bodyShape - The body shape that the new representation will represent.
   * @param model - The name of the content's key that points to the model to be used to build the new representation.
   * @param contents - The contents of the representation to be used to build the new representation.
   */
  public withRepresentation(
    bodyShape: WearableBodyShape,
    model: string,
    contents: RawContent<X>,
    overrideHides: WearableCategory[] = [],
    overrideReplaces: WearableCategory[] = []
  ): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
    }

    const representationAlreadyExists = this.item.data.representations.some(
      (representation) => this.representsBodyShape(bodyShape, representation)
    )

    if (representationAlreadyExists) {
      throw new Error(
        "The representation that you're about to add already exists in the item"
      )
    }

    const sortedContents = sortContent<X>(bodyShape, contents)

    this.newContent = {
      ...this.newContent,
      ...this.getBodyShapeSortedContents(bodyShape, sortedContents),
      ...(this.itemHasRepresentations() && sortedContents.all[THUMBNAIL_PATH]
        ? {}
        : { [THUMBNAIL_PATH]: sortedContents.all[THUMBNAIL_PATH] })
    }

    this.item = {
      ...this.item,
      data: {
        ...this.item.data,
        representations: [
          ...this.item.data.representations,
          ...this.buildRepresentations(
            bodyShape,
            model,
            sortedContents,
            overrideHides,
            overrideReplaces
          )
        ]
      }
    }

    return this
  }

  /**
   * Removes a representation and its contents from the item, taking into consideration the specified body shape.
   * If BOTH is used as the body shape, all the representations will be removed.
   * This method will only remove the thumbnail if after removing the representation there are no representations left.
   * It requires the item to be defined first.
   * @param bodyShape - The body shape that will be used to identify the representation to remove.
   */
  public withoutRepresentation(bodyShape: WearableBodyShape): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
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

    if (!this.itemHasRepresentations()) {
      delete this.item.contents[THUMBNAIL_PATH]
      delete this.newContent[THUMBNAIL_PATH]
    }

    return this
  }

  async build(): Promise<BuiltItem<X>> {
    if (!this.item) {
      throw new Error('The item must be set before creating it')
    }

    return {
      item: {
        ...this.item,
        contents: {
          ...this.item.contents,
          ...(await computeHashes(this.newContent))
        }
      },
      newContent: this.newContent
    }
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
    bodyShape: WearableBodyShape,
    model: string,
    contents: SortedContent<X>,
    overrideHides: WearableCategory[],
    overrideReplaces: WearableCategory[]
  ): WearableRepresentation[] {
    const representations: WearableRepresentation[] = []

    // Add male representation
    if (bodyShape === WearableBodyShape.MALE) {
      representations.push({
        bodyShapes: [WearableBodyShape.MALE],
        mainFile: prefixContentName(WearableBodyShape.MALE, model),
        contents: Object.keys(contents.male),
        overrideHides,
        overrideReplaces
      })
    }

    // Add female representation
    if (bodyShape === WearableBodyShape.FEMALE) {
      representations.push({
        bodyShapes: [WearableBodyShape.FEMALE],
        mainFile: prefixContentName(WearableBodyShape.FEMALE, model),
        contents: Object.keys(contents.female),
        overrideHides,
        overrideReplaces
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
    bodyShape: WearableBodyShape,
    representation: WearableRepresentation
  ): boolean {
    return representation.bodyShapes.includes(bodyShape)
  }

  /**
   * Builds a new record of contents without the contents of the specified body shape.
   * @param bodyShape - The body shape of the contents to be left out.
   * @param contents - The contents to be filtered taking into consideration the specified body shape.
   */
  private removeContentsOfBodyShape<J extends X | string>(
    bodyShape: WearableBodyShape,
    contents: Record<string, J>
  ): Record<string, J> {
    return Object.keys(contents)
      .filter(
        (key) =>
          !key.startsWith(
            bodyShape === WearableBodyShape.MALE ? 'male' : 'female'
          )
      )
      .reduce((accum, key) => {
        accum[key] = contents[key]
        return accum
      }, {} as Record<string, J>)
  }

  /**
   * Checks if the item has representations.
   * It requires the item to be defined first.
   */
  private itemHasRepresentations(): boolean {
    if (!this.item) {
      throw new ItemNotInitializedError()
    }

    return this.item.data.representations.length > 0
  }

  /**
   * Gets the sorted contents based on a given body shape.
   * @param bodyShape - The body shape to get the contents of.
   * @param contents - The full list of sorted contents.
   */
  private getBodyShapeSortedContents(
    bodyShape: WearableBodyShape,
    contents: SortedContent<X>
  ): RawContent<X> {
    switch (bodyShape) {
      case WearableBodyShape.MALE:
        return contents.male
      case WearableBodyShape.FEMALE:
        return contents.female
      default:
        throw new Error(
          `The BodyShape ${bodyShape} couldn't get matched with the content`
        )
    }
  }

  /**
   * Sets an item's property by checking first if the item is defined.
   * @param property - The property of the item to be set.
   * @param value - The value of the property to be set.
   */
  private setItemProperty<T extends keyof LocalItem>(
    property: T,
    value: LocalItem[T]
  ): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
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
  private setItemDataProperty<T extends keyof LocalItem['data']>(
    property: T,
    value: LocalItem['data'][T]
  ): ItemFactory<X> {
    if (!this.item) {
      throw new ItemNotInitializedError()
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

  /**
   * Builds a map of contents based on a list of content paths (keys of the map).
   * @param rawContent - The map containing the content available for an item.
   * @param contentPaths - The paths or keys of the rawContent map to build the new content map.
   */
  private buildWearableConfigRepresentationContents(
    rawContent: RawContent<X>,
    contentPaths: string[]
  ): RawContent<X> {
    return contentPaths.reduce((accumulator, content) => {
      accumulator[content] = rawContent[content]
      return accumulator
    }, {} as RawContent<X>)
  }
}
