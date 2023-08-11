import * as z from "zod"

export const UserLimitsPrismaModel = z.object({
  id: z.string(),
  totalMB: z.number().int(),
  customUrls: z.number().int(),
})
