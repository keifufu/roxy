import { z } from 'zod'

export const FileDeleteInputDTO = z.object({
  id: z.string().length(36)
})

export const FileDeleteOutputDTO = z.void()