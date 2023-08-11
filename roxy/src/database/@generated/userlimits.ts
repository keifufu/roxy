import * as z from "zod"
import { CompleteUser, RelatedUserZodModel } from "./index"

export const UserLimitsZodModel = z.object({
  id: z.string(),
  totalMB: z.number().int(),
  customUrls: z.number().int(),
})

export interface CompleteUserLimits extends z.infer<typeof UserLimitsZodModel> {
  ZDONTUSE_User?: CompleteUser | null
}

/**
 * RelatedUserLimitsZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUserLimitsZodModel: z.ZodSchema<CompleteUserLimits> = z.lazy(() => UserLimitsZodModel.extend({
  ZDONTUSE_User: RelatedUserZodModel.nullish(),
}))
