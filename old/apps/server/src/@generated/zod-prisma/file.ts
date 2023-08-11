import * as z from "zod"

export const FilePrismaModel = z.object({
  id: z.string(),
  thumbnailId: z.string().nullish(),
  thumbnailBytes: z.number().int(),
  userId: z.string(),
  uniqueKeyId: z.string(),
  filename: z.string(),
  ext: z.string(),
  mimeType: z.string(),
  bytes: z.number().int(),
})
