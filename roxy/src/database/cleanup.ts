import { Config } from "../utils/config";
import { prisma } from "./prisma";

export async function runCleanupTask() {
  await cleanupExpiredSessions();
  await cleanupPendingDeletedUsers();
}

// TODO: something in here is crashing prisma with RangeError: Invalid time value

async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      updatedAt: {
        lte: new Date(
          Date.now() - Config.getSecret("refreshJwtExpirationSeconds") * 1000
        ),
      },
    },
  });
}

async function cleanupPendingDeletedUsers() {
  const scheduledDeletionUsers = await prisma.user.findMany({
    where: { scheduledDeletion: { lte: new Date() } },
  });
  scheduledDeletionUsers.forEach(async (user) => {
    await prisma.uniqueKey.deleteMany({ where: { userId: user.id } });
    await prisma.userLimits.delete({ where: { id: user.limitsId } });
    await prisma.userUsage.delete({ where: { id: user.usageId } });
  });
}
