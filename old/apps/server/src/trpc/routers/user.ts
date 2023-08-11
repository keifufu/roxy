import { createApiKey, getLogoutCookies, hashPassword, verifyPassword } from './auth'
import { UserChangePasswordInputDTO, UserChangePasswordOutputDTO } from './dto/user/changePassword.dto'
import { UserDeleteAccountInputDTO, UserDeleteAccountOutputDTO } from './dto/user/deleteAccount.dto'
import { UserDeleteSessionInputDTO, UserDeleteSessionOutputDTO } from './dto/user/deleteSession.dto'
import { UserGetSessionsInputDTO, UserGetSessionsOutputDTO } from './dto/user/getSessions.dto'

import { TRPCError } from '@trpc/server'
import { prisma } from '../../database/prisma'
import { JwtTwoFactorGuardProcedure } from '../middleware/JwtTwoFactorGuard'
import { router } from '../trpc'
import { UserChangeUsernameInputDTO, UserChangeUsernameOutputDTO } from './dto/user/changeUsername.dto'
import { UserGetAllInputDTO, UserGetAllOutputDTO } from './dto/user/getAll.dto'
import { UserResetApiKeyInputDTO, UserResetApiKeyOutputDTO } from './dto/user/resetApiKey.dto'
import { UserSetLimitsInputDTO, UserSetLimitsOutputDTO } from './dto/user/setLimits'

export const userRouter = router({
  getSessions: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/user/get-sessions', tags: ['User'], protect: true } })
    .input(UserGetSessionsInputDTO)
    .output(UserGetSessionsOutputDTO)
    .query(async ({ ctx }) => {
      const sessions = await prisma.session.findMany({ where: { userId: ctx.user.id } })
      return sessions
    }),
  deleteSession: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/delete-session', tags: ['User'], protect: true } })
    .input(UserDeleteSessionInputDTO)
    .output(UserDeleteSessionOutputDTO)
    .query(async ({ input }) => {
      await prisma.session.delete({ where: { id: input.sessionId } }).catch(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to delete Session' })
      })
    }),
  changePassword: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/change-password', tags: ['User'], protect: true },
      rateLimit: { max: 3, windowM: 60 } })
    .input(UserChangePasswordInputDTO)
    .output(UserChangePasswordOutputDTO)
    .query(async ({ ctx, input }) => {
      const validPassword = await verifyPassword(ctx.user.hashedPassword, input.currentPassword)
      if (!validPassword)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid password' })

      const hashedPassword = await hashPassword(input.newPassword)
      await prisma.$transaction(async (tc) => {
        await tc.user.update({
          where: { id: ctx.user.id },
          data: { hashedPassword }
        })
        await tc.session.deleteMany({
          where: { userId: ctx.user.id }
        })
      }).catch(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update User' })
      })

      ctx.res.setHeader('Set-Cookie', getLogoutCookies())
    }),
  deleteAccount: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/delete-account', tags: ['User'], protect: true } })
    .input(UserDeleteAccountInputDTO)
    .output(UserDeleteAccountOutputDTO)
    .query(async ({ ctx, input }) => {
      const validPassword = await verifyPassword(ctx.user.hashedPassword, input.password)
      if (!validPassword)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid password' })

      const oneWeekFromNow = new Date(new Date().getTime() + (7 * 24 * 60 * 60 * 1000))
      await prisma.$transaction([
        prisma.user.update({ where: { id: ctx.user.id }, data: { scheduledDeletion: oneWeekFromNow } }),
        prisma.session.deleteMany({ where: { userId: ctx.user.id } })
      ]).catch(() => {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to schedule account deletion' })
      })
    }),
  changeUsername: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/change-username', tags: ['User'], protect: true } })
    .input(UserChangeUsernameInputDTO)
    .output(UserChangeUsernameOutputDTO)
    .query(async ({ ctx, input }) => {
      const isValid = await verifyPassword(ctx.user.hashedPassword, input.password)
      if (!isValid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid password' })

      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { username: input.username },
        include: { limits: true, usage: true }
      })

      return user
    }),
  resetApiKey: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/reset-api-key', tags: ['User'], protect: true } })
    .input(UserResetApiKeyInputDTO)
    .output(UserResetApiKeyOutputDTO)
    .query(async ({ ctx, input }) => {
      const isValid = await verifyPassword(ctx.user.hashedPassword, input.password)
      if (!isValid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid password' })

      const apiKey = createApiKey()

      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { apiKey }
      })

      return user.apiKey
    }),
  getAll: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/get-all', tags: ['User'], protect: true } })
    .input(UserGetAllInputDTO)
    .output(UserGetAllOutputDTO)
    .query(async ({ ctx }) => {
      if (!ctx.user.isAdministrator)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not authorized to perform this action' })

      const users = await prisma.user.findMany({ include: { usage: true, limits: true } })
      return users
    }),
  setLimits: JwtTwoFactorGuardProcedure
    .meta({ openapi: { method: 'POST', path: '/user/set-limits', tags: ['User'], protect: true } })
    .input(UserSetLimitsInputDTO)
    .output(UserSetLimitsOutputDTO)
    .query(async ({ ctx, input }) => {
      if (!ctx.user.isAdministrator)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not authorized to perform this action' })

      const user = await prisma.user.update({
        where: { id: input.userId },
        data: {
          limits: {
            update: {
              ...input
            }
          }
        },
        include: { limits: true, usage: true }
      })

      return user
    })
})