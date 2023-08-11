import * as z from "zod"
import { CompleteUniqueKey, RelatedUniqueKeyZodModel } from "./index"

export const UrlShortenerZodModel = z.object({
  id: z.string(),
  userId: z.string(),
  uniqueKeyId: z.string(),
  isCustomKey: z.boolean(),
  expirationDate: z.date().nullish(),
  maxClicks: z.number().int().nullish(),
  destinationUrl: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteUrlShortener extends z.infer<typeof UrlShortenerZodModel> {
  uniqueKey: CompleteUniqueKey
}

/**
 * RelatedUrlShortenerZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUrlShortenerZodModel: z.ZodSchema<CompleteUrlShortener> = z.lazy(() => UrlShortenerZodModel.extend({
  uniqueKey: RelatedUniqueKeyZodModel,
}))
