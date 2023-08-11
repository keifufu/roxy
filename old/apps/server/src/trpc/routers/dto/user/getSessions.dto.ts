import { z } from 'zod'
import { SessionDTO } from '../shared'

export const UserGetSessionsInputDTO = z.void()

export const UserGetSessionsOutputDTO = z.array(SessionDTO)