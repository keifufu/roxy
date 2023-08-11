import * as z from "zod"

export const UserUsagePrismaModel = z.object({
  id: z.string(),
  bytesUsed: z.number().int(),
})
