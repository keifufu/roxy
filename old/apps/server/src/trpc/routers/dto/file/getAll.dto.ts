import { z } from 'zod'
import { FilePrismaModel } from '../../../../@generated/zod-prisma'

export const FileGetAllInputDTO = z.void()

export const FileGetAllOutputDTO = z.array(FilePrismaModel)