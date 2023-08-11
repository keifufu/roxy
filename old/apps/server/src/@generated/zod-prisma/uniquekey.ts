import * as z from "zod"

export const UniqueKeyPrismaModel = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  clickCount: z.number().int(),
})
