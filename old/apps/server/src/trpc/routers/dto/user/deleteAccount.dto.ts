import { z } from 'zod'

export const UserDeleteAccountInputDTO = z.object({
  password: z.string().max(4096)
})

export const UserDeleteAccountOutputDTO = z.void()