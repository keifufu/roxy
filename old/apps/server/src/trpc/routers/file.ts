import { TRPCError } from '@trpc/server'
import fs from 'node:fs'
import { prisma } from '../../database/prisma'
import { updateBytesUsed } from '../../expressRoutes/upload'
import { FileUtils } from '../../utils/FIleUtils'
import { JwtTwoFactorGuardProcedure } from '../middleware/JwtTwoFactorGuard'
import { router } from '../trpc'
import { FileDeleteInputDTO, FileDeleteOutputDTO } from './dto/file/delete.dto'
import { FileGetAllInputDTO, FileGetAllOutputDTO } from './dto/file/getAll.dto'

export const fileRouter = router({
  getAll: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/file/get-all', tags: ['File'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(FileGetAllInputDTO)
    .output(FileGetAllOutputDTO)
    .query(async ({ ctx }) => {
      const files = await prisma.file.findMany({ where: { userId: ctx.user.id } })
      return files
    }),
  delete: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/file/delete', tags: ['File'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(FileDeleteInputDTO)
    .output(FileDeleteOutputDTO)
    .query(async ({ ctx, input }) => {
      const file = await prisma.file.findUnique({ where: { id: input.id, userId: ctx.user.id } })
      if (!file) throw new TRPCError({ code: 'BAD_REQUEST', message: 'File not found' })
      await prisma.uniqueKey.delete({ where: { id: file.uniqueKeyId } }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete File' })
      })

      if (fs.existsSync(FileUtils.getFilePath(file)))
        fs.rmSync(FileUtils.getFilePath(file))
      if (fs.existsSync(FileUtils.getFileThumbnailPath(file)))
        fs.rmSync(FileUtils.getFileThumbnailPath(file))

      updateBytesUsed(ctx.user.id)
    })
})