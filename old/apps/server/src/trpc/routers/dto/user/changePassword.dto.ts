import { z } from 'zod'

export const UserChangePasswordInputDTO = z.object({
  currentPassword: z.string().max(4096),
  newPassword: z.string().max(4096)
})

export const UserChangePasswordOutputDTO = z.void()