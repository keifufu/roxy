import * as z from "zod"

export const ClickPrismaModel = z.object({
  id: z.string(),
  ipAddress: z.string(),
  location: z.string(),
  userAgent: z.string(),
  createdAt: z.date(),
  uniqueKeyId: z.string().nullish(),
})
