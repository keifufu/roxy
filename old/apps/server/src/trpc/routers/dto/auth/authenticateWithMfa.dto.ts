import { SessionDTO, UserDTO } from '../shared'

import { z } from 'zod'

export const AuthAuthenticateWithMfaInputDTO = z.object({
  mfaOrBackupCode: z.string().max(12, 'Invalid MFA Code') // No strict validation because we format it later
})

export const AuthAuthenticateWithMfaOutputDTO = z.object({
  user: UserDTO,
  session: SessionDTO
})