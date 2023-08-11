import { z } from 'zod'

export const UrlShortenerDeleteInputDTO = z.object({
  id: z.string().length(36)
})

export const UrlShortenerDeleteOutputDTO = z.void()