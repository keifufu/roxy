import { z } from 'zod'

export const UserDeleteSessionInputDTO = z.object({
  sessionId: z.string().length(36)
})

export const UserDeleteSessionOutputDTO = z.void()