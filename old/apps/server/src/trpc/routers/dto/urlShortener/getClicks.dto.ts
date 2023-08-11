import { z } from 'zod'
import { ClickDTO } from '../shared'

export const UrlShortenerGetClicksInputDTO = z.object({
  urlShortenerId: z.string().length(36)
})

export const UrlShortenerGetClicksOutputDTO = ClickDTO.array()