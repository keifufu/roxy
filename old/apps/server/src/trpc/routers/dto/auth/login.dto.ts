import { SessionDTO, UserDTO } from '../shared'

import { z } from 'zod'
import { JwtDTO } from './shared'

export const AuthLoginInputDTO = z.object({
  username: z.string(),
  password: z.string().max(4096, 'Password too long'),
  cancelDeletion: z.boolean().optional()
})

export const AuthLoginOutputDTO = z.object({
  user: UserDTO,
  session: SessionDTO,
  accessJwt: JwtDTO,
  refreshJwt: JwtDTO
})