import { z } from 'zod'
import { UserDTO } from '../shared'

export const UserGetAllInputDTO = z.void()

export const UserGetAllOutputDTO = z.array(UserDTO.omit({
  apiKey: true
}))