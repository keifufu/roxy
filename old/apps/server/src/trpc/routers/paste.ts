import { TRPCError } from '@trpc/server'
import { prisma } from '../../database/prisma'
import { updateBytesUsed } from '../../expressRoutes/upload'
import { URLUtils } from '../../utils/URLUtils'
import { Env } from '../../utils/env'
import { getUniqueKey } from '../../utils/getUniqueKey'
import { JwtTwoFactorGuardProcedure } from '../middleware/JwtTwoFactorGuard'
import { router } from '../trpc'
import { PasteCreateInputDTO, PasteCreateOutputDTO } from './dto/paste/create.dto'
import { PasteDeleteInputDTO, PasteDeleteOutputDTO } from './dto/paste/delete.dto'
import { PasteGetAllInputDTO, PasteGetAllOutputDTO } from './dto/paste/getAll.dto'

export const pasteRouter = router({
  create: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/paste/create', tags: ['Paste'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(PasteCreateInputDTO)
    .output(PasteCreateOutputDTO)
    .query(async ({ ctx, input }) => {
      const key = await getUniqueKey(Env.instance.get('PASTE_KEY_LENGTH'))
      if (key === null) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate unique key' })
      const paste = await prisma.paste.create({
        data: {
          userId: ctx.user.id,
          content: input.content,
          title: input.title,
          bytes: Buffer.byteLength(input.content, 'utf8'),
          uniqueKey: {
            create: {
              key,
              userId: ctx.user.id
            }
          }
        },
        include: { uniqueKey: true }
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create paste' })
      })
      updateBytesUsed(ctx.user.id)

      return {
        paste,
        url: URLUtils.makeUrl(`${paste.uniqueKey.key}`)
      }
    }),
  getAll: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/paste/get-all', tags: ['Paste'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(PasteGetAllInputDTO)
    .output(PasteGetAllOutputDTO)
    .query(async ({ ctx }) => {
      const pastes = await prisma.paste.findMany({ where: { userId: ctx.user.id } })
      return pastes
    }),
  delete: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/paste/delete', tags: ['Paste'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(PasteDeleteInputDTO)
    .output(PasteDeleteOutputDTO)
    .query(async ({ ctx, input }) => {
      const paste = await prisma.paste.findUnique({ where: { id: input.id, userId: ctx.user.id } })
      if (!paste) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Paste not found' })
      await prisma.uniqueKey.delete({ where: { id: paste.uniqueKeyId } }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete Paste' })
      })
      updateBytesUsed(ctx.user.id)
    })
})