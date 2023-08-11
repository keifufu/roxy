import { z } from 'zod'
import { RateLimitGuardProcedure } from '../middleware/RateLimitGuard'
import { router } from '../trpc'
import { authRouter } from './auth'
import { fileRouter } from './file'
import { pasteRouter } from './paste'
import { urlShortenerRouter } from './urlShortener'
import { userRouter } from './user'

export const appRouter = router({
  alive: RateLimitGuardProcedure
    .meta({ openapi: { method: 'GET', path: '/alive', tags: ['General'] }, rateLimit: { max: 10, windowMs: 5000 } })
    .input(z.void({}))
    .output(z.string())
    .query(() => 'yay!'),
  auth: authRouter,
  file: fileRouter,
  paste: pasteRouter,
  urlShortener: urlShortenerRouter,
  user: userRouter
})

export type AppRouter = typeof appRouter;