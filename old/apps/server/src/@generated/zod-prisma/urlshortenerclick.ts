import * as z from "zod"

export const UrlShortenerClickPrismaModel = z.object({
  id: z.string(),
  urlShortenerId: z.string(),
  ipAddress: z.string(),
  location: z.string(),
  userAgent: z.string(),
  createdAt: z.date(),
})
