import { z } from 'zod'
import { UrlShortenerPrismaModel } from '../../../../@generated/zod-prisma'

export const UrlShortenerCreateInputDTO = z.object({
  // key is only set for custom URLs
  key: z.string().min(3).max(32).optional(),
  destinationUrl: z.string().max(4096).url(),
  // expiration date is null if the URL never expires
  expirationDate: z.string().nullable().optional(),
  maxClicks: z.number().optional()
})

export const UrlShortenerCreateOutputDTO = z.object({
  urlShortener: UrlShortenerPrismaModel,
  url: z.string()
})