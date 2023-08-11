import * as z from "zod"

export const UserPrismaModel = z.object({
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
