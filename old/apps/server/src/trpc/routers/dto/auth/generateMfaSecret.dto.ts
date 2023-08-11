import { z } from 'zod'

export const AuthGenerateMfaSecretInputDTO = z.object({
  password: z.string().max(4096, 'Password too long')
})

export const AuthGenerateMfaSecretOutputDTO = z.object({
  secret: z.string(),
  otpAuthUrl: z.string()
})