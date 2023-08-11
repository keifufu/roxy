import { z } from 'zod'
import { UserLimitsPrismaModel } from '../../../../@generated/zod-prisma'
import { UserDTO } from '../shared'

export const UserSetLimitsInputDTO = z.object({
  userId: z.string(),
  limits: UserLimitsPrismaModel.omit({
    id: true
  })
})

export const UserSetLimitsOutputDTO = UserDTO