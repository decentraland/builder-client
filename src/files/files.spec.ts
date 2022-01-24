import JSZip from 'jszip'
import { THUMBNAIL_PATH } from '../item/constants'
import { BodyShapeType, Rarity, WearableCategory } from '../item/types'
import { ASSET_MANIFEST, MAX_FILE_SIZE } from './constants'
import { loadFile } from './files'
import {
  FileNotFoundError,
  FileTooBigError,
  InvalidAssetFileError,
  ModelFileNotFoundError,
  ModelInRepresentationNotFoundError,
  WrongExtensionError
} from './files.errors'
import { AssetJSON } from './types'

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
    let zipFileContent: Uint8Array
    let thumbnailContent: Uint8Array

    beforeEach(() => {
      fileName = 'test.zip'
      thumbnailContent = new Uint8Array([4, 5, 6, 7])
      zipFile = new JSZip()
      zipFile.file(THUMBNAIL_PATH, thumbnailContent)
    })

    describe('and the zip has an asset file', () => {
      describe('and the asset file is wrongly formatted', () => {
        beforeEach(async () => {
          zipFile.file(ASSET_MANIFEST, '{}')
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the asset file is invalid', () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).rejects.toThrow(new InvalidAssetFileError())
        })
      })

      describe('and the asset file contains a representation whose main file is not part of the representation contents', () => {
        beforeEach(async () => {
          const assetFile: AssetJSON = {
            id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
            name: 'test',
            category: WearableCategory.EYEBROWS,
            rarity: Rarity.COMMON,
            representations: [
              {
                bodyShape: BodyShapeType.MALE,
                mainFile: 'some-unkown-file.glb',
                contents: ['some-other-file.png'],
                overrideHides: [],
                overrideReplaces: []
              }
            ]
          }

          zipFile.file(ASSET_MANIFEST, JSON.stringify(assetFile))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it("should throw an error signaling that the main file isn't included in the representation contents", () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).rejects.toThrow(
            new ModelInRepresentationNotFoundError('some-unkown-file.glb')
          )
        })
      })

      describe('and the asset file contains a representation whose content is not present in the zipped file', () => {
        beforeEach(async () => {
          const assetFile: AssetJSON = {
            id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
            name: 'test',
            category: WearableCategory.EYEBROWS,
            rarity: Rarity.COMMON,
            representations: [
              {
                bodyShape: BodyShapeType.MALE,
                mainFile: 'some-unkown-file.glb',
                contents: ['some-unkown-file.glb'],
                overrideHides: [],
                overrideReplaces: []
              }
            ]
          }
          zipFile.file(ASSET_MANIFEST, JSON.stringify(assetFile))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the file in the representation contents was not found', () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).rejects.toThrow(new FileNotFoundError('some-unkown-file.glb'))
        })
      })

      describe("and the asset file is valid and contains all the representations' files", () => {
        let assetFileContent: AssetJSON
        let modelFile: string
        let modelFileContent: Uint8Array
        let textureFile: string
        let textureFileContent: Uint8Array

        beforeEach(async () => {
          modelFile = 'some-model.glb'
          modelFileContent = new Uint8Array([0, 1, 2, 3, 4])
          textureFile = 'a-texture-file.png'
          textureFileContent = new Uint8Array([5, 6, 7])

          assetFileContent = {
            id: 'f12313b4-a76b-4c9e-a2a3-ab460f59bd67',
            name: 'test',
            category: WearableCategory.EYEBROWS,
            rarity: Rarity.COMMON,
            urn: 'urn:decentraland:mumbai:collections-thirdparty:thirdparty-id:collection-id:token-id',
            representations: [
              {
                bodyShape: BodyShapeType.MALE,
                mainFile: modelFile,
                contents: [modelFile, textureFile],
                overrideHides: [],
                overrideReplaces: []
              }
            ]
          }
          zipFile.file(ASSET_MANIFEST, JSON.stringify(assetFileContent))
          zipFile.file(modelFile, modelFileContent)
          zipFile.file(textureFile, textureFileContent)
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should build the LoadedFile with the zipped contents and the asset file', () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).resolves.toEqual({
            content: {
              [modelFile]: modelFileContent,
              [textureFile]: textureFileContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            asset: assetFileContent
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
        return expect(
          loadFile<Uint8Array>(fileName, zipFileContent)
        ).rejects.toThrow(new FileTooBigError(modelFile, MAX_FILE_SIZE + 1))
      })
    })

    describe("and the zip doesn't have an asset file", () => {
      let modelContent: Uint8Array

      beforeEach(async () => {
        modelContent = new Uint8Array([0, 1, 2, 3])
      })

      describe("and it doesn't contain a model file either", () => {
        beforeEach(async () => {
          zipFileContent = await zipFile.generateAsync({ type: 'uint8array' })
        })

        it("should throw an error signaling that the zip doesn't contain a model file", () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).rejects.toThrow(new ModelFileNotFoundError())
        })
      })

      describe('and it contains a model file', () => {
        const mainModel = 'test.gltf'
        beforeEach(async () => {
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({ type: 'uint8array' })
        })

        it('should build the LoadedFile contents with the zipped files and the main model file path', () => {
          return expect(
            loadFile<Uint8Array>(fileName, zipFileContent)
          ).resolves.toEqual({
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
