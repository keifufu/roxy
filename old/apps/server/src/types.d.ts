// We re-export types here for other apps to easily access them
// export type * from '@prisma/client'

import { type z } from 'zod'
import { type SessionDTO, type UserDTO } from './trpc/routers/dto/shared'

export type User = z.infer<typeof UserDTO>
export type Session = z.infer<typeof SessionDTO>