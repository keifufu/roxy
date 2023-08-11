import { middleware, publicProcedure } from '../trpc'

import { TRPCError } from '@trpc/server'
import { type Request, type Response } from 'express'
import { GLOBAL_RATE_LIMIT_PER_SECOND } from '../../utils/env'
import { getIpFromRequest } from '../../utils/trackingUtils'
import { type Context } from '../context'

declare type TRPCMeta = Record<string, unknown>;
export declare type RateLimitMeta<TMeta = TRPCMeta> = TMeta & {
  rateLimit?: {
    windowMs?: number
    windowS?: number
    windowM?: number
    max: number
  }
}

function calculateWindowMs(options: Options): number {
  if (options.windowMs) return options.windowMs
  if (options.windowS) return options.windowS * 1000
  if (options.windowM) return options.windowM * 1000 * 60
  return 1000
}

// Most of this is heavily inspired by express-rate-limit
function calculateNextHitTime(windowMs: number): Date {
  const resetTime = new Date()
  resetTime.setMilliseconds(resetTime.getMilliseconds() + windowMs)
  return resetTime
}

type IncrementResponse = {
  totalHits: number
  resetTime: Date | undefined
}

interface Options {
  windowMs?: number
  windowS?: number
  windowM?: number
  max: number,
  route?: string
}

class RateLimitStore {
  windowMs!: number
  resetTime!: Date
  interval?: NodeJS.Timer
  route: string
  hits: Map<string, number>

  constructor(options: Options) {
    this.windowMs = calculateWindowMs(options)
    this.resetTime = calculateNextHitTime(this.windowMs)
    this.route = options.route || 'global'
    this.hits = new Map<string, number>()

    this.interval = setInterval(() => {
      this.resetAll()
    }, this.windowMs)
    if (this.interval.unref) this.interval.unref()
  }

  _getKey(key: string) {
    return `rate-limit:${this.route}:${key.replaceAll(':', ';')}`
  }

  increment(key: string): IncrementResponse {
    const currentHits = this.hits.get(key) ?? 0
    const totalHits = currentHits + 1
    this.hits.set(key, totalHits)

    return {
      totalHits,
      resetTime: this.resetTime
    }
  }

  resetAll() {
    this.hits = new Map<string, number>()
    this.resetTime = calculateNextHitTime(this.windowMs)
  }
}


function generateKey(request: Request, ctx?: Context): string {
  if (ctx?.user) return ctx.user.id
  return getIpFromRequest(request, true)
}

const stores: {
  [key: string]: RateLimitStore
} = {
}

const globalOptions = {
  windowMs: 1000,
  max: GLOBAL_RATE_LIMIT_PER_SECOND,
  route: 'global'
}

const RateLimit = async (next: () => any, res: Response, path: string, key: string, shouldThrow: boolean, meta?: RateLimitMeta) => {
  if (meta?.rateLimit) {
    if (!stores.global) stores.global = new RateLimitStore(globalOptions)
    const globalStore = stores.global

    // Since we need one store per route, create a new one if one doesn't already exist
    if (!stores[path]) stores[path] = new RateLimitStore({ route: path, ...meta.rateLimit })
    const store = stores[path]

    // Increase the client's and global hit counters by one
    const [{ totalHits, resetTime }, { totalHits: globalTotalHits }] = await Promise.all([
      store.increment(key),
      globalStore.increment(key)
    ])

    // Get the quota (max number of hits) for each client
    const maxHits = meta.rateLimit.max
    const globalMaxHits = globalOptions.max

    // First check for global quota, then client quota
    if (globalMaxHits && globalTotalHits > globalMaxHits) {
      res.setHeader('Retry-After', Math.ceil(globalOptions.windowMs / 1000))

      if (shouldThrow) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Server is busy, please try again later'
        })
      } else {
        res.status(429)
        res.render('ratelimit')
        res.end()
        return
      }
    }

    res.setHeader('X-RateLimit-Limit', maxHits)
    res.setHeader('X-RateLimit-Remaining', Math.max(maxHits - totalHits, 0))

    // If we have a resetTime, also provide the current date to help avoid issues with incorrect clocks
    if (resetTime instanceof Date) {
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000))
      res.setHeader('Date', new Date().toUTCString())
    }

    // Set the standardized RateLimit headers on the response object
    res.setHeader('RateLimit-Limit', maxHits)
    res.setHeader('RateLimit-Remaining', Math.max(maxHits - totalHits, 0))

    if (resetTime) {
      const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      res.setHeader('RateLimit-Reset', Math.max(0, deltaSeconds))
    }

    // Here express-rate-limit implements skipFailedRequests and skipSuccessfulRequests
    // However, they are defaulted to false and I don't think we will use them so I'm
    // not implementing them as of now

    // If the client has exceeded their rate limit, set the Retry-After header
    // and throw a TRPCError
    if (maxHits && totalHits > maxHits) {
      res.setHeader('Retry-After', Math.ceil(calculateWindowMs(meta.rateLimit) / 1000))

      if (shouldThrow) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests'
        })
      } else {
        res.status(429)
        res.render('ratelimit')
        res.end()
        return
      }
    }
  }

  // If the client has not exceeded their rate limit, or no options have been passed,
  // continue to the next middleware
  return next()
}

export const createExpressRateLimitMiddleware = (meta: RateLimitMeta) => async (req: Request, res: Response, next: () => void) => {
  // AuthGuards should be called before RateLimitGuard so the user may be defined
  // Get a unique key for the client
  // userId if authenticated, ip otherwise
  const key = generateKey(req)
  return await RateLimit(next, res, req.path, key, false, meta)
}

export const RateLimitGuard = middleware(async ({ meta, next, ctx, path }) => {
  // AuthGuards should be called before RateLimitGuard so the user may be defined
  // Get a unique key for the client
  // userId if authenticated, ip otherwise
  const key = generateKey(ctx.req, ctx)
  return await RateLimit(next, ctx.res, path, key, true, meta as RateLimitMeta)
})

export const RateLimitGuardProcedure = publicProcedure.use(RateLimitGuard)