import * as z from "zod"
import { CompleteUniqueKey, RelatedUniqueKeyZodModel } from "./index"

export const PasteZodModel = z.object({
  id: z.string(),
  userId: z.string(),
  uniqueKeyId: z.string(),
  title: z.string(),
  content: z.string(),
  bytes: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompletePaste extends z.infer<typeof PasteZodModel> {
  uniqueKey: CompleteUniqueKey
}

/**
 * RelatedPasteZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPasteZodModel: z.ZodSchema<CompletePaste> = z.lazy(() => PasteZodModel.extend({
  uniqueKey: RelatedUniqueKeyZodModel,
}))
