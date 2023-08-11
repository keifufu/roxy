import { z } from 'zod'

export const UserResetApiKeyInputDTO = z.object({
  password: z.string().max(4096)
})

export const UserResetApiKeyOutputDTO = z.string()