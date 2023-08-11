import { JWT_REFRESH_TOKEN_EXPIRATION_TIME } from '../utils/env'
import { prisma } from './prisma'

export async function runCleanupTask() {
  await cleanupExpiredSessions()
  await cleanupPendingDeletedUsers()
}

async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({ where: { updatedAt: { lte: new Date(Date.now() - (JWT_REFRESH_TOKEN_EXPIRATION_TIME * 1000)) } } })
}

async function cleanupPendingDeletedUsers() {
  const scheduledDeletionUsers = await prisma.user.findMany({ where: { scheduledDeletion: { lte: new Date() } } })
  scheduledDeletionUsers.forEach(async (user) => {
    await prisma.uniqueKey.deleteMany({ where: { userId: user.id } })
    await prisma.userLimits.delete({ where: { id: user.limitsId } })
    await prisma.userUsage.delete({ where: { id: user.usageId } })
  })
}