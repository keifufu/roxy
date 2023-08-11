import { z } from 'zod'
import { PastePrismaModel } from '../../../../@generated/zod-prisma'

export const PasteGetAllInputDTO = z.void()

export const PasteGetAllOutputDTO = z.array(PastePrismaModel)