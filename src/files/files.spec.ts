import { WearableBodyShape } from '@dcl/schemas'
import JSZip from 'jszip'
import { THUMBNAIL_PATH } from '../item/constants'
import { Rarity, WearableCategory } from '../item/types'
import { WEARABLE_MANIFEST, MAX_FILE_SIZE, BUILDER_MANIFEST } from './constants'
import { loadFile } from './files'
import {
  FileNotFoundError,
  FileTooBigError,
  InvalidBuilderConfigFileError,
  InvalidWearableConfigFileError,
  ModelFileNotFoundError,
  ModelInRepresentationNotFoundError,
  WrongExtensionError
} from './files.errors'
import { WearableConfig } from './types'

describe('when loading an item file', () => {
  const extensions = ['glb', 'gltf', 'png']
  let fileName: string

  describe('and the file is not a zip nor a model file', () => {
    beforeEach(() => {
      fileName = 'test.txt'
    })

    it('should throw an error signaling that the file does not have the correct extension', () => {
      return expect(
        loadFile<Uint8Array>(fileName, new Uint8Array())
      ).rejects.toThrow(new WrongExtensionError(fileName))
    })
  })

  extensions.forEach((extension) => {
    describe(`and the file is a ${extension} model`, () => {
      let fileContent: Uint8Array

      beforeEach(() => {
        fileName = `test.${extension}`
        fileContent = new Uint8Array()
      })

      it('should build the LoadedFile contents and the main model file path', async () => {
        const loadedFile = await loadFile<Uint8Array>(fileName, fileContent)

        expect(loadedFile.content).toEqual({
          [fileName]: fileContent
        })

        expect(loadedFile.mainModel).toEqual(fileName)
      })
    })
  })

  describe('and the file is a zip model file', () => {
    let zipFile: JSZip
    let zipFileContent: Uint8Array | ArrayBuffer
    let thumbnailContent: Uint8Array

    beforeEach(() => {
      fileName = 'test.zip'
      thumbnailContent = new Uint8Array([4, 5, 6, 7])
      zipFile = new JSZip()
      zipFile.file(THUMBNAIL_PATH, thumbnailContent)
    })

    describe('and the zip has a wearable config file', () => {
      describe('and the wearable config file is wrongly formatted', () => {
        beforeEach(async () => {
          zipFile.file(WEARABLE_MANIFEST, '{}')
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the wearable config file is invalid', () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new InvalidWearableConfigFileError()
          )
        })
      })

      describe('and the wearable config file contains a representation whose main file is not part of the representation contents', () => {
        beforeEach(async () => {
          const wearableConfigFile: WearableConfig = {
            id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
            name: 'test',
            rarity: Rarity.COMMON,
            data: {
              category: WearableCategory.EYEBROWS,
              hides: [],
              replaces: [],
              tags: [],
              representations: [
                {
                  bodyShapes: [WearableBodyShape.MALE],
                  mainFile: 'some-unkown-file.glb',
                  contents: ['some-other-file.png'],
                  overrideHides: [],
                  overrideReplaces: []
                }
              ]
            }
          }

          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableConfigFile))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it("should throw an error signaling that the main file isn't included in the representation contents", () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new ModelInRepresentationNotFoundError('some-unkown-file.glb')
          )
        })
      })

      describe('and the wearable config file contains a representation whose content is not present in the zipped file', () => {
        beforeEach(async () => {
          const wearableConfig: WearableConfig = {
            id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
            name: 'test',
            rarity: Rarity.COMMON,
            data: {
              category: WearableCategory.EYEBROWS,
              hides: [],
              replaces: [],
              tags: [],
              representations: [
                {
                  bodyShapes: [WearableBodyShape.MALE],
                  mainFile: 'some-unkown-file.glb',
                  contents: ['some-unkown-file.glb'],
                  overrideHides: [],
                  overrideReplaces: []
                }
              ]
            }
          }
          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableConfig))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the file in the representation contents was not found', () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new FileNotFoundError('some-unkown-file.glb')
          )
        })
      })

      describe("and the wearable config file is valid and contains all the representations' files", () => {
        let wearableFileContent: WearableConfig
        let modelFile: string
        let modelFileContent: Uint8Array
        let textureFile: string
        let textureFileContent: Uint8Array

        beforeEach(async () => {
          modelFile = 'some-model.glb'
          modelFileContent = new Uint8Array([0, 1, 2, 3, 4])
          textureFile = 'a-texture-file.png'
          textureFileContent = new Uint8Array([5, 6, 7])

          wearableFileContent = {
            id: 'urn:decentraland:mumbai:collections-thirdparty:thirdparty-id:collection-id:token-id',
            name: 'test',
            rarity: Rarity.COMMON,
            data: {
              category: WearableCategory.EYEBROWS,
              hides: [],
              replaces: [],
              tags: [],
              representations: [
                {
                  bodyShapes: [WearableBodyShape.MALE],
                  mainFile: modelFile,
                  contents: [modelFile, textureFile],
                  overrideHides: [],
                  overrideReplaces: []
                }
              ]
            }
          }
          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableFileContent))
          zipFile.file(modelFile, modelFileContent)
          zipFile.file(textureFile, textureFileContent)
        })

        describe('and the zip file is in the Uint8Array format', () => {
          beforeEach(async () => {
            zipFileContent = await zipFile.generateAsync({
              type: 'uint8array'
            })
          })

          it('should build the LoadedFile with the zipped contents and the wearable config file with the same buffer format as the zip', () => {
            return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
              content: {
                [modelFile]: modelFileContent,
                [textureFile]: textureFileContent,
                [THUMBNAIL_PATH]: thumbnailContent
              },
              wearable: wearableFileContent
            })
          })
        })

        describe('and the zip file is in the ArrayBuffer format', () => {
          beforeEach(async () => {
            zipFileContent = await zipFile.generateAsync({
              type: 'arraybuffer'
            })
          })

          it('should build the LoadedFile with the zipped contents and the wearable config file with the same buffer format as the zip', () => {
            return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
              content: {
                [modelFile]: modelFileContent.buffer,
                [textureFile]: textureFileContent.buffer,
                [THUMBNAIL_PATH]: thumbnailContent.buffer
              },
              wearable: wearableFileContent
            })
          })
        })

        describe('and the zip file is in the Buffer format', () => {
          beforeEach(async () => {
            zipFileContent = await zipFile.generateAsync({
              type: 'nodebuffer'
            })
          })

          it('should build the LoadedFile with the zipped contents and the wearable config file with the same buffer format as the zip', () => {
            return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
              content: {
                [modelFile]: Buffer.from(modelFileContent.buffer),
                [textureFile]: Buffer.from(textureFileContent.buffer),
                [THUMBNAIL_PATH]: Buffer.from(thumbnailContent.buffer)
              },
              wearable: wearableFileContent
            })
          })
        })
      })
    })

    describe('and the zip has a builder config file', () => {
      describe('and the builder config file is wrongly formatted', () => {
        beforeEach(async () => {
          zipFile.file(BUILDER_MANIFEST, '{ "aWrongProperty": "something" }')
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the wearable config file is invalid', () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new InvalidBuilderConfigFileError()
          )
        })
      })

      describe('and the builder config file contains an id', () => {
        const mainModel = 'test.gltf'
        let modelContent: Uint8Array

        beforeEach(async () => {
          modelContent = new Uint8Array([0, 1, 2, 3])
          zipFile.file(
            BUILDER_MANIFEST,
            '{ "id": "a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2" }'
          )
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should build the LoadedFile contents with the zipped files, the main model file path and the builder information', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [mainModel]: modelContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            builder: { id: 'a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2' },
            mainModel
          })
        })
      })

      describe('and the builder config file contains a collection id', () => {
        const mainModel = 'test.gltf'
        let modelContent: Uint8Array

        beforeEach(async () => {
          modelContent = new Uint8Array([0, 1, 2, 3])
          zipFile.file(
            BUILDER_MANIFEST,
            '{ "collectionId": "a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2" }'
          )
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should build the LoadedFile contents with the zipped files, the main model file path and the builder information', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [mainModel]: modelContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            builder: { collectionId: 'a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2' },
            mainModel
          })
        })
      })

      describe('and the zip contains a builder and a wearable config file', () => {
        let wearableFileContent: WearableConfig
        let modelFile: string
        let modelFileContent: Uint8Array
        let textureFile: string
        let textureFileContent: Uint8Array

        beforeEach(async () => {
          modelFile = 'some-model.glb'
          modelFileContent = new Uint8Array([0, 1, 2, 3, 4])
          textureFile = 'a-texture-file.png'
          textureFileContent = new Uint8Array([5, 6, 7])

          wearableFileContent = {
            id: 'urn:decentraland:mumbai:collections-thirdparty:thirdparty-id:collection-id:token-id',
            name: 'test',
            rarity: Rarity.COMMON,
            data: {
              category: WearableCategory.EYEBROWS,
              hides: [],
              replaces: [],
              tags: [],
              representations: [
                {
                  bodyShapes: [WearableBodyShape.MALE],
                  mainFile: modelFile,
                  contents: [modelFile, textureFile],
                  overrideHides: [],
                  overrideReplaces: []
                }
              ]
            }
          }
          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableFileContent))
          zipFile.file(modelFile, modelFileContent)
          zipFile.file(textureFile, textureFileContent)
          zipFile.file(
            BUILDER_MANIFEST,
            '{ "id": "ac5a6289-32c0-4a6a-ad05-58e0d42a609f", "collectionId": "a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2" }'
          )
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should build the LoadedFile with the zipped contents, the wearable and the builder configs', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [modelFile]: modelFileContent,
              [textureFile]: textureFileContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            builder: {
              id: 'ac5a6289-32c0-4a6a-ad05-58e0d42a609f',
              collectionId: 'a81e1272-73bf-4b62-ab0f-3d2fd2fad1d2'
            },
            wearable: wearableFileContent
          })
        })
      })
    })

    describe('and the zip file contains a file that exceeds the maximum file size limit', () => {
      const modelFile = 'test.glb'

      beforeEach(async () => {
        zipFile.file(modelFile, new Uint8Array(MAX_FILE_SIZE + 1))
        zipFileContent = await zipFile.generateAsync({
          type: 'uint8array'
        })
      })

      it('should throw an error signaling that the file is too big', () => {
        return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
          new FileTooBigError(modelFile, MAX_FILE_SIZE + 1)
        )
      })
    })

    describe("and the zip doesn't have a wearable config file", () => {
      let modelContent: Uint8Array

      beforeEach(async () => {
        modelContent = new Uint8Array([0, 1, 2, 3])
      })

      describe("and it doesn't contain a model file either", () => {
        beforeEach(async () => {
          zipFileContent = await zipFile.generateAsync({ type: 'uint8array' })
        })

        it("should throw an error signaling that the zip doesn't contain a model file", () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new ModelFileNotFoundError()
          )
        })
      })

      describe('and it contains a model file', () => {
        const mainModel = 'test.gltf'

        beforeEach(async () => {
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({ type: 'uint8array' })
        })

        it('should build the LoadedFile contents with the zipped files and the main model file path', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [mainModel]: modelContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            mainModel
          })
        })
      })
    })
  })
})
