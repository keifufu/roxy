import { type File } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

export const FileUtils = {
  getFolderPath() {
    const dir = path.resolve('../../data/files')
    fs.mkdirSync(dir, { recursive: true })
    return dir
  },
  getFilenamePath: (filename: string) => `${FileUtils.getFolderPath()}/${filename}`,
  getFilePath: (file: File) => `${FileUtils.getFolderPath()}/${file.id}.${file.ext}`,
  getFileThumbnailPath: (file: File) => `${FileUtils.getFolderPath()}/${file.thumbnailId}.webp`,
  isImage: (file: Pick<File, 'mimeType'>) => file.mimeType.startsWith('image/'),
  isVideo: (file: Pick<File, 'mimeType'>) => file.mimeType.startsWith('video/'),
  isAudio: (file: Pick<File, 'mimeType'>) => file.mimeType.startsWith('audio/'),
  hasThumbnail: (mimeType: string) => FileUtils.isImage({ mimeType }) || FileUtils.isVideo({ mimeType })
}