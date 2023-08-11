import { z } from 'zod'

export const AuthEnableMfaInputDTO = z.object({
  mfaCode: z.string().max(12, 'Invalid MFA Code') // No strict validation because we format it later
})

export const AuthEnableMfaOutputDTO = z.void()