import { prisma } from "../database/prisma";

export async function recalculateUserLimits(userId: string) {
  const pastes = await prisma.paste.findMany({ where: { userId } });
  const pasteBytes = pastes.reduce((acc, paste) => acc + paste.bytes, 0);
  const files = await prisma.file.findMany({ where: { userId } });
  const fileBytes = files.reduce(
    (acc, file) => acc + file.bytes + file.thumbnailBytes,
    0
  );
  const bytesUsed = pasteBytes + fileBytes;

  await prisma.user.update({
    where: { id: userId },
    data: { usage: { update: { bytesUsed } } },
  });
}
