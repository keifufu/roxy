import { SessionDTO, UserDTO } from '../shared'

import { z } from 'zod'
import { JwtDTO } from './shared'

export const AuthRefreshInputDTO = z.void()

export const AuthRefreshOutputDTO = z.object({
  user: UserDTO,
  session: SessionDTO,
  accessJwt: JwtDTO,
  refreshJwt: JwtDTO.nullable()
})