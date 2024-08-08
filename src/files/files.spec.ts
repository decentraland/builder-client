import {
  EmoteCategory,
  EmotePlayMode,
  MappingType,
  RequiredPermission,
  BodyShape as WearableBodyShape
} from '@dcl/schemas'
import JSZip from 'jszip'
import { THUMBNAIL_PATH } from '../item/constants'
import { Rarity, WearableCategory } from '../item/types'
import {
  WEARABLE_MANIFEST,
  MAX_WEARABLE_FILE_SIZE,
  MAX_SKIN_FILE_SIZE,
  BUILDER_MANIFEST,
  SCENE_MANIFEST,
  EMOTE_MANIFEST,
  MAX_EMOTE_FILE_SIZE,
  MAX_SMART_WEARABLE_FILE_SIZE
} from './constants'
import { loadFile } from './files'
import {
  FileNotFoundError,
  FileTooBigError,
  InvalidBuilderConfigFileError,
  InvalidSceneConfigFileError,
  InvalidWearableConfigFileError,
  MissingRequiredPropertiesError,
  ModelFileNotFoundError,
  WrongExtensionError
} from './files.errors'
import { FileType, SceneConfig, WearableConfig } from './types'

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

    describe('and the zip has a scene config file', () => {
      describe('and the zip contains a scene but not a wearable', () => {
        let sceneFileContent: SceneConfig

        beforeEach(async () => {
          sceneFileContent = {
            scene: {
              parcels: ['0,0', '0,1', '1,0', '1,1'],
              base: '0,0'
            },
            main: 'game.js',
            requiredPermissions: [
              RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE
            ]
          }
          zipFile.file(SCENE_MANIFEST, JSON.stringify(sceneFileContent))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should throw an error signaling that the wearable config file is missing', () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            new FileNotFoundError(WEARABLE_MANIFEST)
          )
        })
      })
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
              ],
              blockVrmExport: false
            }
          }

          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableConfigFile))
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it("should throw an error signaling that the main file isn't included in the representation contents", () => {
          return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
            'The wearable config file is invalid'
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
              ],
              blockVrmExport: true
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

      describe('and the zip contains a mapping', () => {
        let wearableFileContent: WearableConfig
        let modelFile: string
        let modelFileContent: Uint8Array
        let textureFile: string
        let textureFileContent: Uint8Array

        beforeEach(() => {
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
              ],
              blockVrmExport: true
            }
          }
          zipFile.file(modelFile, modelFileContent)
          zipFile.file(textureFile, textureFileContent)
        })

        describe('and the mapping is invalid', () => {
          beforeEach(async () => {
            wearableFileContent.mapping = {
              type: MappingType.RANGE,
              from: '10',
              to: '1'
            }
            zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableFileContent))
            zipFileContent = await zipFile.generateAsync({
              type: 'uint8array'
            })
          })

          it('should throw an error signaling that the mappings are invalid', () => {
            return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
              new InvalidWearableConfigFileError()
            )
          })
        })

        describe('and the mapping is valid', () => {
          beforeEach(async () => {
            wearableFileContent.mapping = { type: MappingType.ANY }
            zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableFileContent))
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
      })

      describe('and the zip also contains a scene config file', () => {
        let wearableFileContent: WearableConfig
        let modelFile: string
        let modelFileContent: Uint8Array
        let textureFile: string
        let textureFileContent: Uint8Array
        let sceneMainFile: string
        let sceneMainFileContent: Uint8Array

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
          sceneMainFile = 'game.js'
          sceneMainFileContent = new Uint8Array([0, 1, 2, 3, 4])
          zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableFileContent))
          zipFile.file(modelFile, modelFileContent)
          zipFile.file(textureFile, textureFileContent)
          zipFile.file(sceneMainFile, sceneMainFileContent)
        })

        describe('and the scene config file is wrongly formatted', () => {
          beforeEach(async () => {
            zipFile.file(
              SCENE_MANIFEST,
              '{"main": "game.js","scene": {"parcels": ["0,0", "0,1", "1,0", "1,1"],"base": "0,0" }, "owner": [35] }'
            )

            zipFileContent = await zipFile.generateAsync({
              type: 'uint8array'
            })
          })

          it('should throw an error signaling that the scene config file is invalid', () => {
            return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
              new InvalidSceneConfigFileError()
            )
          })
        })

        describe('and the main property of the scene config file is not present in the zipped file', () => {
          let sceneFileContent: SceneConfig

          beforeEach(async () => {
            sceneFileContent = {
              scene: {
                parcels: ['0,0', '0,1', '1,0', '1,1'],
                base: '0,0'
              },
              requiredPermissions: [RequiredPermission.OPEN_EXTERNAL_LINK]
            } as SceneConfig
            zipFile.file(SCENE_MANIFEST, JSON.stringify(sceneFileContent))
            zipFileContent = await zipFile.generateAsync({
              type: 'uint8array'
            })
          })

          it('should throw an error signaling that the main property is missing in the scene config', () => {
            return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
              new MissingRequiredPropertiesError(['main'])
            )
          })
        })

        describe('and the scene config file is valid and contains the main property in the zipped file', () => {
          let sceneFileContent: SceneConfig

          beforeEach(() => {
            sceneMainFile = 'game.js'
            sceneMainFileContent = new Uint8Array([0, 1, 2, 3, 4])
            sceneFileContent = {
              scene: {
                parcels: ['0,0', '0,1', '1,0', '1,1'],
                base: '0,0'
              },
              main: sceneMainFile,
              requiredPermissions: [RequiredPermission.OPEN_EXTERNAL_LINK]
            }
            zipFile.file(SCENE_MANIFEST, JSON.stringify(sceneFileContent))
            zipFile.file(sceneMainFile, sceneMainFileContent)
          })

          describe('and the zip file is in the Uint8Array format', () => {
            beforeEach(async () => {
              zipFileContent = await zipFile.generateAsync({
                type: 'uint8array'
              })
            })

            it('should build the LoadedFile with the zipped contents and the wearable config file with the same buffer format as the zip', () => {
              return expect(
                loadFile(fileName, zipFileContent)
              ).resolves.toEqual({
                content: {
                  [modelFile]: modelFileContent,
                  [textureFile]: textureFileContent,
                  [sceneMainFile]: sceneMainFileContent,
                  [THUMBNAIL_PATH]: thumbnailContent
                },
                wearable: wearableFileContent,
                scene: sceneFileContent
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
              return expect(
                loadFile(fileName, zipFileContent)
              ).resolves.toEqual({
                content: {
                  [modelFile]: modelFileContent.buffer,
                  [textureFile]: textureFileContent.buffer,
                  [sceneMainFile]: sceneMainFileContent.buffer,
                  [THUMBNAIL_PATH]: thumbnailContent.buffer
                },
                wearable: wearableFileContent,
                scene: sceneFileContent
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
              return expect(
                loadFile(fileName, zipFileContent)
              ).resolves.toEqual({
                content: {
                  [modelFile]: Buffer.from(modelFileContent.buffer),
                  [textureFile]: Buffer.from(textureFileContent.buffer),
                  [sceneMainFile]: Buffer.from(sceneMainFileContent.buffer),
                  [THUMBNAIL_PATH]: Buffer.from(thumbnailContent.buffer)
                },
                wearable: wearableFileContent,
                scene: sceneFileContent
              })
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

    describe('and the zip has an emote config file', () => {
      describe('and the emote config file has unsupported properties', () => {
        const mainModel = 'test.gltf'
        let modelContent: Uint8Array

        beforeEach(async () => {
          modelContent = new Uint8Array([0, 1, 2, 3])
          zipFile.file(EMOTE_MANIFEST, '{ "unsupportedProp": "something" }')
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should ignore invalid property', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [mainModel]: modelContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            emote: {},
            mainModel
          })
        })
      })

      describe('and the emote config file contains all properties', () => {
        const mainModel = 'test.gltf'
        let modelContent: Uint8Array

        beforeEach(async () => {
          modelContent = new Uint8Array([0, 1, 2, 3])
          zipFile.file(
            EMOTE_MANIFEST,
            '{"name": "test", "description": "test d", "rarity": "unique", "category": "fun", "play_mode": "simple" }'
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
            emote: {
              name: 'test',
              description: 'test d',
              rarity: Rarity.UNIQUE,
              category: EmoteCategory.FUN,
              play_mode: EmotePlayMode.SIMPLE
            },
            mainModel
          })
        })
      })

      describe('and the emote config file contains a really long description', () => {
        const mainModel = 'test.gltf'
        let modelContent: Uint8Array

        beforeEach(async () => {
          modelContent = new Uint8Array([0, 1, 2, 3])
          zipFile.file(
            EMOTE_MANIFEST,
            '{ "description": "this is a really loooooooooooooooooooooooooooooooooooong description", "name": "Name" }'
          )
          zipFile.file(mainModel, modelContent)
          zipFileContent = await zipFile.generateAsync({
            type: 'uint8array'
          })
        })

        it('should ignore description property', () => {
          return expect(loadFile(fileName, zipFileContent)).resolves.toEqual({
            content: {
              [mainModel]: modelContent,
              [THUMBNAIL_PATH]: thumbnailContent
            },
            emote: {
              name: 'Name'
            },
            mainModel
          })
        })
      })
    })

    describe('and the zip file contains a wearable file that exceeds the maximum file size limit', () => {
      const modelFile = 'test.glb'

      beforeEach(async () => {
        zipFile.file(modelFile, new Uint8Array(MAX_WEARABLE_FILE_SIZE + 1))
        const wearableConfigFile: WearableConfig = {
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
                contents: [modelFile],
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

      it('should throw an error signaling that the file is too big', () => {
        return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
          new FileTooBigError(
            fileName,
            MAX_WEARABLE_FILE_SIZE + 1,
            MAX_WEARABLE_FILE_SIZE,
            FileType.WEARABLE
          )
        )
      })
    })

    describe('and the zip file contains a skin file that exceeds the maximum file size limit', () => {
      const modelFile = 'test.glb'

      beforeEach(async () => {
        const wearableConfigFile: WearableConfig = {
          id: 'urn:decentraland:mumbai:collections-thirdparty:thirdparty-id:collection-id:token-id',
          name: 'test',
          rarity: Rarity.COMMON,
          data: {
            category: WearableCategory.SKIN,
            hides: [],
            replaces: [],
            tags: [],
            representations: [
              {
                bodyShapes: [WearableBodyShape.MALE],
                mainFile: modelFile,
                contents: [modelFile],
                overrideHides: [],
                overrideReplaces: []
              }
            ]
          }
        }

        zipFile.file(modelFile, new Uint8Array(MAX_SKIN_FILE_SIZE + 1))
        zipFile.file(WEARABLE_MANIFEST, JSON.stringify(wearableConfigFile))
        zipFileContent = await zipFile.generateAsync({
          type: 'uint8array'
        })
      })

      it('should throw an error signaling that the file is too big', () => {
        return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
          new FileTooBigError(
            fileName,
            MAX_SKIN_FILE_SIZE + 1,
            MAX_SKIN_FILE_SIZE,
            FileType.SKIN
          )
        )
      })
    })

    describe('and the zip file contains a emote file that exceeds the maximum file size limit', () => {
      const modelFile = 'test.glb'

      beforeEach(async () => {
        zipFile.file(modelFile, new Uint8Array(MAX_EMOTE_FILE_SIZE + 1))

        zipFile.file(
          EMOTE_MANIFEST,
          '{ "description": "test description", "name": "Name" }'
        )
        zipFileContent = await zipFile.generateAsync({
          type: 'uint8array'
        })
      })

      it('should throw an error signaling that the file is too big', () => {
        return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
          new FileTooBigError(
            fileName,
            MAX_EMOTE_FILE_SIZE + 1,
            MAX_EMOTE_FILE_SIZE,
            FileType.EMOTE
          )
        )
      })
    })

    describe('and the zip file is a smart wearable that exceeds the maximum file size limit', () => {
      const modelFile = 'test.glb'

      beforeEach(async () => {
        zipFile.file(
          modelFile,
          new Uint8Array(MAX_SMART_WEARABLE_FILE_SIZE + 1)
        )
        const wearableConfigFile: WearableConfig = {
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
                contents: [modelFile],
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
        const sceneMainFile = 'game.js'
        const sceneMainFileContent = new Uint8Array([])
        const sceneFileContent: SceneConfig = {
          scene: {
            parcels: ['0,0', '0,1', '1,0', '1,1'],
            base: '0,0'
          },
          main: sceneMainFile,
          requiredPermissions: [
            RequiredPermission.ALLOW_TO_TRIGGER_AVATAR_EMOTE
          ]
        }
        zipFile.file(SCENE_MANIFEST, JSON.stringify(sceneFileContent))
        zipFileContent = await zipFile.generateAsync({
          type: 'uint8array'
        })
        zipFile.file(sceneMainFile, sceneMainFileContent)
        zipFileContent = await zipFile.generateAsync({
          type: 'uint8array'
        })
      })

      it('should throw an error signaling that the file is too big', () => {
        return expect(loadFile(fileName, zipFileContent)).rejects.toThrow(
          new FileTooBigError(
            fileName,
            MAX_SMART_WEARABLE_FILE_SIZE + 1,
            MAX_SMART_WEARABLE_FILE_SIZE,
            FileType.SMART_WEARABLE
          )
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
