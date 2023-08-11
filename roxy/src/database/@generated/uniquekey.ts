import * as z from "zod"
import { CompleteClick, RelatedClickZodModel, CompleteUrlShortener, RelatedUrlShortenerZodModel, CompletePaste, RelatedPasteZodModel, CompleteFile, RelatedFileZodModel } from "./index"

export const UniqueKeyZodModel = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  clickCount: z.number().int(),
})

export interface CompleteUniqueKey extends z.infer<typeof UniqueKeyZodModel> {
  clicks: CompleteClick[]
  UrlShortener?: CompleteUrlShortener | null
  Paste?: CompletePaste | null
  File?: CompleteFile | null
}

/**
 * RelatedUniqueKeyZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUniqueKeyZodModel: z.ZodSchema<CompleteUniqueKey> = z.lazy(() => UniqueKeyZodModel.extend({
  clicks: RelatedClickZodModel.array(),
  UrlShortener: RelatedUrlShortenerZodModel.nullish(),
  Paste: RelatedPasteZodModel.nullish(),
  File: RelatedFileZodModel.nullish(),
}))
