import z from 'zod'

export const JwtDTO = z.object({
  token: z.string(),
  expires: z.number()
})