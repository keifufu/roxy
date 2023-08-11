import { z } from 'zod'
import { PastePrismaModel } from '../../../../@generated/zod-prisma'

export const PasteCreateInputDTO = z.object({
  title: z.string().max(100),
  content: z.string()
})

export const PasteCreateOutputDTO = z.object({
  paste: PastePrismaModel,
  url: z.string()
})