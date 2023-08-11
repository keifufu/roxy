import { type File } from '@prisma/client'
import { type Router } from 'express'
import ffmpeg from 'fluent-ffmpeg'
import mime from 'mime-types'
import multer from 'multer'
import fs from 'node:fs'
import os from 'node:os'
import sharp from 'sharp'
import { ExpressError } from '..'
import { prisma } from '../database/prisma'
import { apiKeyExpressMiddleware } from '../trpc/middleware/ApiKeyExpressMiddleware'
import { FileUtils } from '../utils/FIleUtils'
import { URLUtils } from '../utils/URLUtils'
import { Env } from '../utils/env'
import { getUniqueKey } from '../utils/getUniqueKey'

const upload = multer({
  dest: os.tmpdir()
})

export const initUploadRoute = (router: Router) => {
  router.post('/upload',
    apiKeyExpressMiddleware,
    upload.single('file'),
    async (req, res, next) => {
      if (!req.user_express) return next(new ExpressError(401, 'Unauthorized'))
      if (!req.file) return next(new ExpressError(400, 'No file provided'))

      const { originalname, mimetype, size, path } = req.file
      const ext = mime.extension(mimetype)
      if (!ext) return next(new ExpressError(400, 'Invalid mime type'))

      const mb = (req.user_express.usage.bytesUsed / 1024 / 1024) + (size / 1024 / 1024)
      if (mb > req.user_express.limits.totalMB && !req.user_express.isAdministrator)
        return next(new ExpressError(400, `Reached the upload limit (${req.user_express.limits.totalMB} MB)`))

      const key = await getUniqueKey(Env.instance.get('FILE_KEY_LENGTH'))
      if (!key) return next(new ExpressError(500, 'Failed to create a new key'))

      // Replace original ext with mime-inferred ext. This is to replace jpg with jpeg etc.
      const filename = `${originalname.split('.').slice(0, -1)}.${ext}`

      let file = await prisma.file.create({
        data: {
          // undefined will make prisma generate a uuid for this
          thumbnailId: FileUtils.hasThumbnail(mimetype) ? undefined : null,
          uniqueKey: { create: { key, userId: req.user_express.id } },
          userId: req.user_express.id,
          filename,
          ext,
          mimeType: mimetype,
          bytes: size
        },
        include: { uniqueKey: true }
      }).catch(() => {
        throw new Error('Failed to create File')
      })

      fs.copyFileSync(path, FileUtils.getFilePath(file))
      fs.rmSync(path)

      if (file.thumbnailId) {
        const bytes = await createThumbnail(file)
        file = await prisma.file.update({
          where: { id: file.id },
          data: { thumbnailBytes: bytes },
          include: { uniqueKey: true }
        })
      }

      updateBytesUsed(req.user_express.id)

      return res.json({
        file,
        url: URLUtils.makeUrl(`${file.uniqueKey.key}.${file.ext}`)
      })
    })
}

async function createThumbnail(file: File) {
  const path = FileUtils.getFilePath(file)
  const thumbnailPath = FileUtils.getFileThumbnailPath(file)
  if (!fs.existsSync(path) || fs.existsSync(thumbnailPath)) return 0

  if (FileUtils.isImage(file)) {
    await sharp(path)
      .resize(300, 200, {
        kernel: sharp.kernel.nearest,
        fit: 'cover'
      })
      .webp({ nearLossless: true })
      .toFile(thumbnailPath)
  } else if (FileUtils.isVideo(file)) {
    await videoThumbnail(path, thumbnailPath)
  }

  return fs.statSync(thumbnailPath).size
}

function videoThumbnail(path: string, thumbnailPath: string) {
  return new Promise((resolve) => {
    ffmpeg(path)
      .thumbnail({
        count: 1,
        timestamps: ['00:00:00'],
        filename: thumbnailPath
      })
      .on('end', resolve)
  })
}

export async function updateBytesUsed(userId: string) {
  const pastes = await prisma.paste.findMany({ where: { userId } })
  const pasteBytes = pastes.reduce((acc, paste) => acc + paste.bytes, 0)
  const files = await prisma.file.findMany({ where: { userId } })
  const fileBytes = files.reduce((acc, file) => acc + file.bytes + file.thumbnailBytes, 0)
  const bytesUsed = pasteBytes + fileBytes

  await prisma.user.update({
    where: { id: userId },
    data: { usage: { update: { bytesUsed } } }
  })
}