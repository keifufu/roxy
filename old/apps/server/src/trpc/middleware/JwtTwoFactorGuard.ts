import { middleware, publicProcedure } from '../trpc'

import { TRPCError } from '@trpc/server'
import jwt from 'jsonwebtoken'
import { prisma } from '../../database/prisma'
import { JWT_ACCESS_TOKEN_SECRET } from '../../utils/env'
import { createApiKeySession, getAccessTokenFromRequest, getApiKeyFromRequest, type TokenPayload } from './JwtAuthGuard'
import { getSessionFromRequest } from './JwtRefreshGuard'
import { RateLimitGuard } from './RateLimitGuard'

const JwtTwoFactorGuard = middleware(async ({ next, ctx }) => {
  const apiKey = getApiKeyFromRequest(ctx.req)
  if (apiKey) {
    const user = await prisma.user.findUnique({ where: { apiKey }, include: { usage: true, limits: true } })
    if (!user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No user with given api key found' })

    return next({ ctx: { ...ctx, user, session: createApiKeySession(user) } })
  }

  const accessToken = getAccessTokenFromRequest(ctx.req)
  let payload
  try {
    payload = jwt.verify(accessToken, JWT_ACCESS_TOKEN_SECRET) as TokenPayload
  } catch (err) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { usage: true, limits: true } })
  if (!user)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No user with given id found' })

  const session = await getSessionFromRequest(ctx.req, user.id)
  if (!session)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No session found' })

  // Accept user as authenticated if mfa is not enabled
  // or if they got a JWT from a MFA endpoint
  if (!user.hasMfaEnabled || session.isMfaAuthenticated)
    return next({ ctx: { ...ctx, user, session } })
  else
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Two factor authentication failed' })
})

// Make sure the auth guards are called before the rate limit guard
export const JwtTwoFactorGuardProcedure = publicProcedure.use(JwtTwoFactorGuard).use(RateLimitGuard)