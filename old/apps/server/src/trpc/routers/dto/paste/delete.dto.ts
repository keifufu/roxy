import { z } from 'zod'

export const PasteDeleteInputDTO = z.object({
  id: z.string().length(36)
})

export const PasteDeleteOutputDTO = z.void()