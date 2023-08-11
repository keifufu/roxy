import { z } from 'zod'
import { UrlShortenerPrismaModel } from '../../../../@generated/zod-prisma'

export const UrlShortenerGetAllInputDTO = z.void()

export const UrlShortenerGetAllOutputDTO = z.array(UrlShortenerPrismaModel)