import { UrlShortenerCreateInputDTO, UrlShortenerCreateOutputDTO } from './dto/urlShortener/create.dto'
import { UrlShortenerDeleteInputDTO, UrlShortenerDeleteOutputDTO } from './dto/urlShortener/delete.dto'
import { UrlShortenerGetAllInputDTO, UrlShortenerGetAllOutputDTO } from './dto/urlShortener/getAll.dto'
import { UrlShortenerGetClicksInputDTO, UrlShortenerGetClicksOutputDTO } from './dto/urlShortener/getClicks.dto'
import { UrlShortenerUpdateInputDTO, UrlShortenerUpdateOutputDTO } from './dto/urlShortener/update.dto'

import { TRPCError } from '@trpc/server'
import { prisma } from '../../database/prisma'
import { URLUtils } from '../../utils/URLUtils'
import { Env } from '../../utils/env'
import { getUniqueKey } from '../../utils/getUniqueKey'
import { JwtTwoFactorGuardProcedure } from '../middleware/JwtTwoFactorGuard'
import { router } from '../trpc'

export const urlShortenerRouter = router({
  getClicks: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/url-shortener/get-clicks', tags: ['Url Shortener'], protect: true } })
    .input(UrlShortenerGetClicksInputDTO)
    .output(UrlShortenerGetClicksOutputDTO)
    .query(async ({ ctx, input }) => {
      // Check if the urlShortener exists to also verify that the requesting user owns it
      const urlShortener = await prisma.urlShortener.findUnique({ where: { id: input.urlShortenerId, userId: ctx.user.id } })
      if (!urlShortener)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Url Shortener not found' })

      const clicks = await prisma.click.findMany({ select: {
        location: true,
        userAgent: true,
        createdAt: true
      }, where: { uniqueKeyId: urlShortener.uniqueKeyId } })

      return clicks
    }),
  getAll: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/url-shortener/get-all', tags: ['Url Shortener'], protect: true } })
    .input(UrlShortenerGetAllInputDTO)
    .output(UrlShortenerGetAllOutputDTO)
    .query(async ({ ctx }) => {
      const urlShorteners = await prisma.urlShortener.findMany({ where: { userId: ctx.user.id } })
      return urlShorteners
    }),
  create: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/url-shortener/create', tags: ['Url Shortener'], protect: true } })
    .input(UrlShortenerCreateInputDTO)
    .output(UrlShortenerCreateOutputDTO)
    .query(async ({ ctx, input }) => {
      const isCustomKey = !!input.key
      let key = input.key

      // Check if the user has reached their limit for custom URLs
      if (isCustomKey) {
        const customUrls = await prisma.urlShortener.count({ where: { userId: ctx.user.id, isCustomKey: true } })
        if (customUrls >= ctx.user.limits.customUrls)
          throw new TRPCError({ code: 'FORBIDDEN', message: `You have reached your limit for custom URLs (${ctx.user.limits.customUrls})` })
      } else {
        const _key = await getUniqueKey(Env.instance.get('URL_SHORTENER_KEY_LENGTH'))
        if (_key === null) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate unique key' })
        key = _key
      }

      const urlShortener = await prisma.urlShortener.create({
        data: {
          userId: ctx.user.id,
          destinationUrl: input.destinationUrl,
          uniqueKey: { create: { key: key as string, userId: ctx.user.id } },
          isCustomKey,
          expirationDate: input.expirationDate && new Date(input.expirationDate),
          maxClicks: input.maxClicks
        },
        include: { uniqueKey: true }
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create Url Shortener' })
      })

      return {
        urlShortener,
        url: URLUtils.makeUrl(`${urlShortener.uniqueKey.key}`)
      }
    }),
  update: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/url-shortener/update', tags: ['Url Shortener'], protect: true } })
    .input(UrlShortenerUpdateInputDTO)
    .output(UrlShortenerUpdateOutputDTO)
    .query(async ({ ctx, input }) => {
      const urlShortener = await prisma.urlShortener.findUnique({ where: { id: input.id, userId: ctx.user.id } })
      if (!urlShortener) throw new TRPCError({ code: 'NOT_FOUND', message: 'The URL Shortener was not found' })

      const updatedUrlShortener = await prisma.urlShortener.update({
        where: { id: input.id, userId: ctx.user.id },
        data: {
          expirationDate: input.expirationDate && new Date(input.expirationDate),
          maxClicks: input.maxClicks
        }
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update Url Shortener' })
      })

      return updatedUrlShortener
    }),
  delete: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/url-shortener/delete', tags: ['Url Shortener'], protect: true } })
    .input(UrlShortenerDeleteInputDTO)
    .output(UrlShortenerDeleteOutputDTO)
    .query(async ({ ctx, input }) => {
      const urlShortener = await prisma.urlShortener.findUnique({ where: { id: input.id, userId: ctx.user.id } })
      if (!urlShortener) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Url Shortener not found' })
      await prisma.uniqueKey.delete({ where: { id: urlShortener.uniqueKeyId } }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete Url Shortener' })
      })
    })
})