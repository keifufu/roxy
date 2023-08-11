import * as z from "zod"

export const UrlShortenerPrismaModel = z.object({
  id: z.string(),
  userId: z.string(),
  uniqueKeyId: z.string(),
  isCustomKey: z.boolean(),
  expirationDate: z.date().nullish(),
  maxClicks: z.number().int().nullish(),
  destinationUrl: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
