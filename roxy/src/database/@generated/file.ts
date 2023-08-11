import * as z from "zod"
import { CompleteUniqueKey, RelatedUniqueKeyZodModel } from "./index"

export const FileZodModel = z.object({
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

export interface CompleteFile extends z.infer<typeof FileZodModel> {
  uniqueKey: CompleteUniqueKey
}

/**
 * RelatedFileZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedFileZodModel: z.ZodSchema<CompleteFile> = z.lazy(() => FileZodModel.extend({
  uniqueKey: RelatedUniqueKeyZodModel,
}))
