import { z } from 'zod'
import { UserDTO } from '../shared'

export const UserChangeUsernameInputDTO = z.object({
  username: z.string().min(3, 'Username too short (3)').max(24, 'Username too long (24)'),
  password: z.string().max(4096)
})

export const UserChangeUsernameOutputDTO = UserDTO