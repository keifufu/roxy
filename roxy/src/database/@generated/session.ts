import * as z from "zod"
import { CompleteUser, RelatedUserZodModel } from "./index"

export const SessionZodModel = z.object({
  id: z.string(),
  userId: z.string(),
  app: z.string(),
  ipAddress: z.string(),
  estimatedLocation: z.string(),
  hashedRefreshToken: z.string(),
  isMfaAuthenticated: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteSession extends z.infer<typeof SessionZodModel> {
  user: CompleteUser
}

/**
 * RelatedSessionZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedSessionZodModel: z.ZodSchema<CompleteSession> = z.lazy(() => SessionZodModel.extend({
  user: RelatedUserZodModel,
}))
