
import { ClickPrismaModel, SessionPrismaModel, UserLimitsPrismaModel, UserPrismaModel, UserUsagePrismaModel } from '../../../@generated/zod-prisma'

export const UserDTO = UserPrismaModel.omit({
  hashedPassword: true,
  sessions: true,
  usageId: true,
  limitsId: true,
  mfaBackupCodes: true,
  mfaSecret: true
}).extend({
  limits: UserLimitsPrismaModel,
  usage: UserUsagePrismaModel
})

export const SessionDTO = SessionPrismaModel.omit({
  userId: true,
  hashedRefreshToken: true
})

export const ClickDTO = ClickPrismaModel.pick({
  location: true,
  userAgent: true,
  createdAt: true
})