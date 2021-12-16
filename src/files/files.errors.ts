export class WrongExtensionError extends Error {
  constructor(file: string) {
    super(`File ${file} has wrong extension`)
  }
}
