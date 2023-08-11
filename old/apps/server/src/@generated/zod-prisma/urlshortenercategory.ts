import * as z from "zod"

export const UrlShortenerCategoryPrismaModel = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  emojiIcon: z.string().nullish(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
