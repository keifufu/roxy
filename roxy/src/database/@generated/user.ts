import * as z from "zod"
import { CompleteSession, RelatedSessionZodModel, CompleteUserLimits, RelatedUserLimitsZodModel, CompleteUserUsage, RelatedUserUsageZodModel } from "./index"

export const UserZodModel = z.object({
  id: z.string(),
  username: z.string(),
  hashedPassword: z.string(),
  mfaSecret: z.string().nullish(),
  mfaBackupCodes: z.string(),
  hasMfaEnabled: z.boolean(),
  apiKey: z.string(),
  scheduledDeletion: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isAdministrator: z.boolean(),
  limitsId: z.string(),
  usageId: z.string(),
})

export interface CompleteUser extends z.infer<typeof UserZodModel> {
  sessions: CompleteSession[]
  limits: CompleteUserLimits
  usage: CompleteUserUsage
}

/**
 * RelatedUserZodModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUserZodModel: z.ZodSchema<CompleteUser> = z.lazy(() => UserZodModel.extend({
  sessions: RelatedSessionZodModel.array(),
  limits: RelatedUserLimitsZodModel,
  usage: RelatedUserUsageZodModel,
}))
