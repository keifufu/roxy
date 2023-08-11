import * as z from "zod"
import { CompleteUser, RelatedUserZodModel } from "./index"

export const UserUsageZodModel = z.object({
  id: z.string(),
  bytesUsed: z.number().int(),
})

export interface CompleteUserUsage extends z.infer<typeof UserUsageZodModel> {
  ZDONTUSE_User?: CompleteUser | null
}

/**
 * RelatedUserUsageZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUserUsageZodModel: z.ZodSchema<CompleteUserUsage> = z.lazy(() => UserUsageZodModel.extend({
  ZDONTUSE_User: RelatedUserZodModel.nullish(),
}))
