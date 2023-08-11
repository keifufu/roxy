import { SessionDTO, UserDTO } from '../shared'

import { z } from 'zod'
import { JwtDTO } from './shared'

export const AuthSignUpInputDTO = z.object({
  username: z.string().min(3, 'Username too short (3)').max(24, 'Username too long (24)'),
  password: z.string().max(4096, 'Password too long')
})

export const AuthSignUpOutputDTO = z.object({
  user: UserDTO,
  session: SessionDTO,
  accessJwt: JwtDTO,
  refreshJwt: JwtDTO
})