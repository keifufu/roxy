/* eslint-disable prefer-destructuring */

import { initTRPC, type DefaultErrorShape, type TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type OpenApiMeta } from 'trpc-openapi'
import { ZodError } from 'zod'
import { type Context } from './context'
import { type RateLimitMeta } from './middleware/RateLimitGuard'

// Exporting this to be able to use it in trpc-openapi
export const errorFormatter = (error: TRPCError, shape: DefaultErrorShape) => ({
  ...shape,
  message:
    error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
      ? error.cause.issues[0].message
      : error.message
})

const t = initTRPC.meta<OpenApiMeta<RateLimitMeta>>().context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ error, shape }) => errorFormatter(error, shape)
})

// We explicitly export the methods we use here.
// This allows us to create reusable & protected base procedures.
export const middleware = t.middleware
export const router = t.router
export const publicProcedure = t.procedure