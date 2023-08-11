import * as z from "zod"

export const PastePrismaModel = z.object({
  id: z.string(),
  userId: z.string(),
  uniqueKeyId: z.string(),
  title: z.string(),
  content: z.string(),
  bytes: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
