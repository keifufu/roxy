import { z } from 'zod'

export const AuthDisableMfaInputDTO = z.object({
  mfaOrBackupCode: z.string().max(12, 'Invalid MFA Code') // No strict validation because we format it later
})

export const AuthDisableMfaOutputDTO = z.void()