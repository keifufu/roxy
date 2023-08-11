import type * as trpcExpress from '@trpc/server/adapters/express'

import { type Session, type User, type UserLimits, type UserUsage } from '@prisma/client'
import { type Request, type Response } from 'express'

import { type inferAsyncReturnType } from '@trpc/server'

export type ContextUser = User & {
  usage: UserUsage,
  limits: UserLimits
}

type ContextOptionalUserAndSession = {
  user: ContextUser | null
  session: Session | null
  req: Request
  res: Response
}

export function createContext(opts: trpcExpress.CreateExpressContextOptions) {
  return {
    user: null,
    session: null,
    req: opts.req,
    res: opts.res
  } as ContextOptionalUserAndSession
}

export type Context = inferAsyncReturnType<typeof createContext>