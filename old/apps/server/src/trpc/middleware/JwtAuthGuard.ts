import { middleware, publicProcedure } from '../trpc'

import { type Session } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { type Request } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../database/prisma'
import { JWT_ACCESS_TOKEN_SECRET } from '../../utils/env'
import { type ContextUser } from '../context'
import { getSessionFromRequest } from './JwtRefreshGuard'
import { RateLimitGuard } from './RateLimitGuard'

export interface TokenPayload {
  userId: string
}

export function getAccessTokenFromRequest(request: Request) {
  let accessToken = request.cookies?.Authentication || request.headers?.authorization
  if (accessToken?.startsWith('Bearer '))
    accessToken = accessToken.split(' ')[1]
  return accessToken ?? ''
}

export function getApiKeyFromRequest(request: Request) {
  if (request.headers.authorization?.startsWith('ApiKey '))
    return request.headers.authorization.split(' ')[1]
  return null
}

export const createApiKeySession = (user: ContextUser): Session => ({
  id: 'api',
  userId: user.id,
  app: 'api',
  ipAddress: 'unknown',
  estimatedLocation: 'unknown',
  hashedRefreshToken: 'unknown',
  isMfaAuthenticated: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

const JwtAuthGuard = middleware(async ({ next, ctx }) => {
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

  /*
     * JwtAuthGuard is only being used on endpoints where a user needs to confirm 2FA of some sort.
     * So if they are already twoFactorAuthenticated then they don't need access to those endpoints anymore
     */
  if (session.isMfaAuthenticated)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Already two factor authenticated' })

  return next({ ctx: { ...ctx, user, session } })
})

// Make sure the auth guards are called before the rate limit guard
export const JwtAuthGuardProcedure = publicProcedure.use(JwtAuthGuard).use(RateLimitGuard)