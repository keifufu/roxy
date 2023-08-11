import argon2, { argon2id } from 'argon2'
import { authenticator } from 'otplib'
import { JwtAuthGuardProcedure, type TokenPayload } from '../middleware/JwtAuthGuard'
import { AuthAuthenticateWithMfaInputDTO, AuthAuthenticateWithMfaOutputDTO } from './dto/auth/authenticateWithMfa.dto'
import { AuthLoginInputDTO, AuthLoginOutputDTO } from './dto/auth/login.dto'
import { AuthLogoutInputDTO, AuthLogoutOutputDTO } from './dto/auth/logout.dto'
import { AuthRefreshInputDTO, AuthRefreshOutputDTO } from './dto/auth/refresh.dto'
import { AuthSignUpInputDTO, AuthSignUpOutputDTO } from './dto/auth/signUp.dto'

import { type User } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { type Request } from 'express'
import { sha256 } from 'js-sha256'
import jwt from 'jsonwebtoken'
import { customAlphabet } from 'nanoid'
import crypto from 'node:crypto'
import { prisma } from '../../database/prisma'
import { Env, JWT_ACCESS_TOKEN_EXPIRATION_TIME, JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_EXPIRATION_TIME, JWT_REFRESH_TOKEN_SECRET } from '../../utils/env'
import { getEstimatedLocationFromRequest, getIpFromRequest, getRawUserAgentFromRequest } from '../../utils/trackingUtils'
import { JwtRefreshGuardProcedure, getRefreshTokenFromRequest } from '../middleware/JwtRefreshGuard'
import { JwtTwoFactorGuardProcedure } from '../middleware/JwtTwoFactorGuard'
import { RateLimitGuardProcedure } from '../middleware/RateLimitGuard'
import { router } from '../trpc'
import { AuthDisableMfaInputDTO, AuthDisableMfaOutputDTO } from './dto/auth/disableMfa.dto'
import { AuthEnableMfaInputDTO, AuthEnableMfaOutputDTO } from './dto/auth/enableMfa.dto'
import { AuthGenerateMfaSecretInputDTO, AuthGenerateMfaSecretOutputDTO } from './dto/auth/generateMfaSecret.dto'

export const authRouter = router({
  signUp: RateLimitGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/signup', tags: ['Auth'] } })
    .input(AuthSignUpInputDTO)
    .output(AuthSignUpOutputDTO)
    .query(async ({ ctx, input }) => {
      if (!Env.instance.get('ALLOW_REGISTRATIONS'))
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Registrations are currently disabled' })

      const mfaBackupCodes: string[] = []
      for (let i = 0; i < 10; i++)
        mfaBackupCodes.push(generateMfaBackupCode())

      const isFirstUser = await prisma.user.count() === 0

      const hashedPassword = await hashPassword(input.password)
      const { user, session, jwtAccessToken, jwtRefreshToken } = await prisma.$transaction(async (tc) => {
        const user = await tc.user.create({
          data: {
            username: input.username,
            hashedPassword: hashedPassword,
            mfaBackupCodes: mfaBackupCodes.join(','),
            apiKey: createApiKey(),
            isAdministrator: isFirstUser,
            usage: { create: {} },
            limits: {
              create: {
                totalMB: Env.instance.get('DEFAULT_LIMITS_TOTAL_MB'),
                customUrls: Env.instance.get('DEFAULT_LIMITS_CUSTOM_URLS')
              }
            }
          },
          include: { limits: true, usage: true }
        }).catch((err) => {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${capitalizeFirstLetter(err.meta.target[0])} is already in use`
          })
        })

        const jwtAccessToken = getJwtAccessToken(user.id)
        const jwtRefreshToken = getJwtRefreshToken(user.id)

        const session = await tc.session.create({
          data: {
            user: {
              connect: {
                id: user.id
              }
            },
            // using sha256 here because we need the output of the hash to always be the same
            hashedRefreshToken: sha256(jwtRefreshToken.jwt.token),
            app: getRawUserAgentFromRequest(ctx.req),
            estimatedLocation: getEstimatedLocationFromRequest(ctx.req),
            ipAddress: getIpFromRequest(ctx.req)
          }
        }).catch(() => {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create session' })
        })

        return { user, session, jwtAccessToken, jwtRefreshToken }
      }).catch((err) => {
        if (err instanceof TRPCError) throw err
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user' })
      })

      ctx.res.setHeader('Set-Cookie', [jwtAccessToken.cookie, jwtRefreshToken.cookie])

      return { user, session, accessJwt: jwtAccessToken.jwt, refreshJwt: jwtRefreshToken.jwt }
    }),
  login: RateLimitGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/login', tags: ['Auth'] },
      rateLimit: { max: 5, windowM: 1 } })
    .input(AuthLoginInputDTO)
    .output(AuthLoginOutputDTO)
    .query(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({ where: { username: input.username }, include: { usage: true, limits: true } })
      if (!user)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid credentials' })

      const validPassword = await verifyPassword(user.hashedPassword, input.password).catch(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid credentials' })
      })

      if (!validPassword)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid credentials' })


      if (user.scheduledDeletion) {
        if (input.cancelDeletion) {
          await prisma.user.update({
            where: { id: user.id },
            data: { scheduledDeletion: null }
          }).catch(() => {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
          })
        } else {
          throw new TRPCError({ code: 'FORBIDDEN', message: `Account is scheduled for deletion on ${user.scheduledDeletion}` })
        }
      }

      const jwtAccessToken = getJwtAccessToken(user.id)
      const jwtRefreshToken = getJwtRefreshToken(user.id)

      const session = await prisma.$transaction(async (tc) => {
        // Delete all sessions with the old Refresh token cookie, if any
        // This is to prevent the user from having multiple sessions from the same browser for example
        // Or multiple sessions from insomnia, etc.
        await tc.session.deleteMany({
          where: {
            userId: user.id,
            hashedRefreshToken: sha256(getRefreshTokenFromRequest(ctx.req))
          }
        })

        const session = await tc.session.create({
          data: {
            user: {
              connect: {
                id: user.id
              }
            },
            // using sha256 here because we need the output of the hash to always be the same
            // so we can query it
            hashedRefreshToken: sha256(jwtRefreshToken.jwt.token),
            app: getRawUserAgentFromRequest(ctx.req),
            estimatedLocation: getEstimatedLocationFromRequest(ctx.req),
            ipAddress: getIpFromRequest(ctx.req)
          }
        })

        return session
      }).catch((err) => {
        if (err instanceof TRPCError) throw err
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create Session' })
      })

      ctx.res.setHeader('Set-Cookie', [jwtAccessToken.cookie, jwtRefreshToken.cookie])

      return { user, session, accessJwt: jwtAccessToken.jwt, refreshJwt: jwtRefreshToken.jwt }
    }),
  logout: JwtAuthGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/logout', tags: ['Auth'], protect: true } })
    .input(AuthLogoutInputDTO)
    .output(AuthLogoutOutputDTO)
    .query(async ({ ctx }) => {
      await prisma.session.delete({ where: { hashedRefreshToken: sha256(getRefreshTokenFromRequest(ctx.req)) } }).catch(() => null)
      ctx.res.setHeader('Set-Cookie', getLogoutCookies())
    }),
  refresh: JwtRefreshGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/auth/refresh', tags: ['Auth'], protect: true } })
    .input(AuthRefreshInputDTO)
    .output(AuthRefreshOutputDTO)
    .query(async ({ ctx }) => {
      const jwtAccessToken = getJwtAccessToken(ctx.user.id)
      const cookies = [jwtAccessToken.cookie]

      // Update refresh token it it's been issued over a day ago.
      // This prevents it from being updated on every refresh, but makes sure
      // it's updated often enough to remain valid.
      const sessionTokenLastUpdatedUnix = Math.floor(Date.parse(ctx.session.updatedAt.toString()) / 1000)
      const currentTimeUnix = Math.floor(Date.now() / 1000)
      const timeSinceLastUpdateInSeconds = currentTimeUnix - sessionTokenLastUpdatedUnix
      const oneDayInSeconds = 86400
      let newRefreshJwt = null
      if (timeSinceLastUpdateInSeconds >= oneDayInSeconds) {
        const jwtRefreshToken = getJwtRefreshToken(ctx.user.id)
        newRefreshJwt = jwtRefreshToken.jwt
        cookies.push(jwtRefreshToken.cookie)
        await prisma.session.update({
          where: { id: ctx.session.id },
          data: {
            hashedRefreshToken: sha256(jwtRefreshToken.jwt.token)
          }
        }).catch(() => {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update Session' })
        })
      }

      ctx.res.setHeader('Set-Cookie', cookies)
      return { user: ctx.user, session: ctx.session, accessJwt: jwtAccessToken.jwt, refreshJwt: newRefreshJwt }
    }),
  generateMfaSecret: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/auth/generate-mfa-secret', tags: ['Auth'], protect: true } })
    .input(AuthGenerateMfaSecretInputDTO)
    .output(AuthGenerateMfaSecretOutputDTO)
    .query(async ({ ctx, input }) => {
      await authenticateWithPassword(ctx.user, ctx.req, input.password)

      if (ctx.user.hasMfaEnabled)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'MFA is already enabled' })

      const secret = authenticator.generateSecret()
      const otpAuthUrl = authenticator.keyuri(ctx.user.id, Env.instance.get('NAME'), secret)
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { mfaSecret: secret }
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
      })

      return { secret, otpAuthUrl }
    }),
  enableMfa: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/enable-mfa', tags: ['Auth'], protect: true } })
    .input(AuthEnableMfaInputDTO)
    .output(AuthEnableMfaOutputDTO)
    .query(async ({ ctx, input }) => {
      if (ctx.user.hasMfaEnabled)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'MFA is already enabled' })

      const isCodeValid = await isMfaOrBackupCodeValid(input.mfaCode, ctx.user, false)

      if (!isCodeValid)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid MFA code' })

      await prisma.$transaction(async (tc) => {
        await tc.user.update({
          where: { id: ctx.user.id },
          data: { hasMfaEnabled: true }
        })

        await tc.session.update({
          where: {
            id: ctx.session.id
          },
          data: {
            isMfaAuthenticated: true
          }
        })
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
      })
    }),
  disableMfa: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/disable-mfa', tags: ['Auth'], protect: true } })
    .input(AuthDisableMfaInputDTO)
    .output(AuthDisableMfaOutputDTO)
    .query(async ({ ctx, input }) => {
      if (!ctx.user.hasMfaEnabled)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'MFA is already disabled' })

      const isCodeValid = await isMfaOrBackupCodeValid(input.mfaOrBackupCode, ctx.user)
      if (!isCodeValid)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code' })

      await prisma.$transaction(async (tc) => {
        await tc.user.update({
          where: { id: ctx.user.id },
          data: { hasMfaEnabled: false }
        }).catch(() => {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
        })

        // Update all sessions to disable isMfaAuthenticated
        await tc.session.updateMany({
          where: { userId: ctx.user.id, isMfaAuthenticated: true },
          data: { isMfaAuthenticated: false }
        }).catch(() => {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update Sessions' })
        })
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
      })
    }),
  authenticateWithMfa: JwtAuthGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/auth/authenticate-mfa', tags: ['Auth'], protect: true },
      rateLimit: { max: 5, windowM: 1 } })
    .input(AuthAuthenticateWithMfaInputDTO)
    .output(AuthAuthenticateWithMfaOutputDTO)
    .query(async ({ ctx, input }) => {
      const isCodeValid = await isMfaOrBackupCodeValid(input.mfaOrBackupCode, ctx.user)
      if (!isCodeValid)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code' })

      await prisma.session.update({
        where: { id: ctx.session.id },
        data: { isMfaAuthenticated: true }
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update Session' })
      })

      const session = { ...ctx.session, isMfaAuthenticated: true, updatedAt: new Date() }
      return { user: ctx.user, session }
    })
})

async function isMfaOrBackupCodeValid(mfaCode: string, user: User, allowBackupCodes = true) {
  const sanitizedCode = mfaCode.split(' ').join('').replaceAll('-', '')
  const validMfa = authenticator.check(sanitizedCode, user.mfaSecret || '')
  if (validMfa) return true
  if (!allowBackupCodes) return false
  // Otherwise check if the code is a backup code
  const isBackupCode = user.mfaBackupCodes.includes(mfaCode)
  if (!isBackupCode) return false
  // If it is a backup code, remove it from the list of valid backup codes and add a new one
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaBackupCodes: user.mfaBackupCodes.replace(mfaCode, generateMfaBackupCode())
    }
  }).catch(() => {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
  })
  return true
}

function generateMfaBackupCode() {
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789')
  return nanoid(8)
}

function getJwtAccessToken(userId: string) {
  const payload: TokenPayload = { userId }
  const token = jwt.sign(payload, JWT_ACCESS_TOKEN_SECRET, { expiresIn: JWT_ACCESS_TOKEN_EXPIRATION_TIME })

  return {
    cookie: `Authentication=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWT_ACCESS_TOKEN_EXPIRATION_TIME};`,
    jwt: { token, expires: JWT_ACCESS_TOKEN_EXPIRATION_TIME }
  }
}

function getJwtRefreshToken(userId: string) {
  const payload: TokenPayload = { userId }
  const token = jwt.sign(payload, JWT_REFRESH_TOKEN_SECRET, { expiresIn: JWT_REFRESH_TOKEN_EXPIRATION_TIME })
  // Note: Path needs to remain "/", we use the refresh token in getSessionFromRequest,
  // which is used basically everywhere, due to being used in JwtTwoFactorGuard
  const cookie = `Refresh=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWT_REFRESH_TOKEN_EXPIRATION_TIME};`
  return {
    cookie,
    jwt: { token, expires: JWT_REFRESH_TOKEN_EXPIRATION_TIME }
  }
}

export async function verifyPassword(hashedPassword: string, plainTextPassword: string) {
  try {
    if (await argon2.verify(hashedPassword, plainTextPassword))
      return true
    return false
  } catch (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid login credentials' })
  }
}

export async function authenticateWithPassword(user: User, req: Request, password: string) {
  const isPasswordValid = await verifyPassword(user.hashedPassword, password)
  if (!isPasswordValid)
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid password' })
}

export async function hashPassword(password: string) {
  return await argon2.hash(password, { type: argon2id })
}

export const createApiKey = () => crypto.randomBytes(32).toString('hex')

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function getLogoutCookies() {
  return [
    'Authentication=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'Refresh=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  ]
}