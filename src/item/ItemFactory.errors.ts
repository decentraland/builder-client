export class ItemNotInitializedError extends Error {
  constructor() {
    super('Item has not been initialized')
  }
}
