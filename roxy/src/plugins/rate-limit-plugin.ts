import { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { StatusCodes } from "http-status-codes";
import { RoxyError } from "..";
import { getIpFromRequest } from "../utils/tracking-utils";

declare module "fastify" {
  interface FastifyReply {
    rateLimit(opts: RateLimitOptions, user?: Roxy.User): FastifyReply;
  }
}

type RateLimitOptions = {
  windowMs?: number;
  windowS?: number;
  windowM?: number;
  max: number;
  exceptions?: string[];
};

function calculateWindowMs(options: RateLimitOptions): number {
  if (options.windowMs) return options.windowMs;
  if (options.windowS) return options.windowS * 1000;
  if (options.windowM) return options.windowM * 1000 * 60;
  return 1000;
}

function calculateNextHitTime(windowMs: number): Date {
  const resetTime = new Date();
  resetTime.setMilliseconds(resetTime.getMilliseconds() + windowMs);
  return resetTime;
}

type IncrementResponse = {
  totalHits: number;
  resetTime: Date | undefined;
};

class RateLimitStore {
  windowMs!: number;
  resetTime!: Date;
  interval?: NodeJS.Timer;
  path: string;
  hits: Map<string, number>;

  constructor(options: RateLimitOptions, path: string) {
    this.windowMs = calculateWindowMs(options);
    this.resetTime = calculateNextHitTime(this.windowMs);
    this.path = path;
    this.hits = new Map<string, number>();

    this.interval = setInterval(() => {
      this.resetAll();
    }, this.windowMs);
    if (this.interval.unref) this.interval.unref();
  }

  _getKey(key: string) {
    return `rate-limit:${this.path}:${key.replaceAll(":", ";")}`;
  }

  increment(key: string): IncrementResponse {
    const currentHits = this.hits.get(key) ?? 0;
    const totalHits = currentHits + 1;
    this.hits.set(key, totalHits);

    return {
      totalHits,
      resetTime: this.resetTime,
    };
  }

  resetAll() {
    this.hits = new Map<string, number>();
    this.resetTime = calculateNextHitTime(this.windowMs);
  }
}

function generateKey(res: FastifyReply, user?: Roxy.User): string {
  return user?.id || getIpFromRequest(res.request, true);
}

const stores: {
  [key: string]: RateLimitStore;
} = {};

// TODO: this currently applies global rate limit on every call
// we already call it once per request with a hook though

function rateLimitLogic(
  res: FastifyReply,
  opts: RateLimitOptions,
  path: string,
  user?: Roxy.User
): RoxyError | undefined {
  const key = generateKey(res, user);
  if (opts.exceptions) {
    for (const exception in opts.exceptions) {
      if (path.includes(exception)) return;
    }
  }

  // Since we need one store per route, create a new one if one doesn't already exist
  if (!stores[path]) stores[path] = new RateLimitStore(opts, path);
  const store = stores[path];

  const { totalHits, resetTime } = store.increment(key);
  const maxHits = opts.max;

  res.header("X-RateLimit-Limit", maxHits);
  res.header("X-RateLimit-Remaining", Math.max(maxHits - totalHits, 0));

  // If we have a resetTime, also provide the current date to help avoid issues with incorrect clocks
  if (resetTime instanceof Date) {
    res.header("X-RateLimit-Reset", Math.ceil(resetTime.getTime() / 1000));
    res.header("Date", new Date().toUTCString());
  }

  // Set the standardized RateLimit headers on the response object
  res.header("RateLimit-Limit", maxHits);
  res.header("RateLimit-Remaining", Math.max(maxHits - totalHits, 0));

  if (resetTime) {
    const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    res.header("RateLimit-Reset", Math.max(0, deltaSeconds));
  }

  // If the client has exceeded their rate limit, set the Retry-After header
  // and throw a RoxyError
  if (maxHits && totalHits > maxHits) {
    res.header("Retry-After", Math.ceil(calculateWindowMs(opts) / 1000));
    return new RoxyError({
      code: StatusCodes.TOO_MANY_REQUESTS,
      message:
        path === "global"
          ? "Server is busy, please try again later"
          : "Too many requests",
    });
  }
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitOptions> = async (
  fastify,
  opts
) => {
  fastify.addHook("preHandler", (_, res, done) => {
    const err = rateLimitLogic(res, opts, "global");
    done(err);
  });
  fastify.decorateReply(
    "rateLimit",
    function rateLimit(
      this: FastifyReply,
      opts: RateLimitOptions,
      user?: Roxy.User
    ) {
      const err = rateLimitLogic(this, opts, this.request.url, user);
      if (err) throw err;
      return this;
    }
  );
};

export default fp(rateLimitPlugin);
