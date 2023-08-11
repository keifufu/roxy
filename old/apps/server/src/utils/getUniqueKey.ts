import { customAlphabet } from 'nanoid'
import { prisma } from '../database/prisma'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789')

export const getUniqueKey = async (length: number, i = 0): Promise<string | null> => {
  if (i >= 10) return null
  const key = nanoid(length)
  const isTaken = await prisma.uniqueKey.findUnique({ where: { key } })
  if (isTaken) return await getUniqueKey(length, i + 1)
  return key
}