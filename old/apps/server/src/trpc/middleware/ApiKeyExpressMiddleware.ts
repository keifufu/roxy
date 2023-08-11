/* eslint-disable @typescript-eslint/no-namespace */
import { type NextFunction, type Request, type Response } from 'express'
import { ExpressError } from '../..'
import { prisma } from '../../database/prisma'
import { type ContextUser } from '../context'
import { getApiKeyFromRequest } from './JwtAuthGuard'

declare global {
  namespace Express {
    interface Request {
      user_express?: ContextUser
    }
  }
}

export const apiKeyExpressMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = getApiKeyFromRequest(req)
  if (apiKey) {
    const user = await prisma.user.findUnique({ where: { apiKey }, include: { usage: true, limits: true } })
    if (!user) return next(new ExpressError(401, 'Unauthorized'))

    req.user_express = user
    return next()
  }

  next(new ExpressError(401, 'Unauthorized'))
}