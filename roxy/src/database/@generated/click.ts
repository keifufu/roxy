import * as z from "zod"
import { CompleteUniqueKey, RelatedUniqueKeyZodModel } from "./index"

export const ClickZodModel = z.object({
  id: z.string(),
  ipAddress: z.string(),
  location: z.string(),
  userAgent: z.string(),
  createdAt: z.date(),
  uniqueKeyId: z.string().nullish(),
})

export interface CompleteClick extends z.infer<typeof ClickZodModel> {
  UniqueKey?: CompleteUniqueKey | null
}

/**
 * RelatedClickZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedClickZodModel: z.ZodSchema<CompleteClick> = z.lazy(() => ClickZodModel.extend({
  UniqueKey: RelatedUniqueKeyZodModel.nullish(),
}))
