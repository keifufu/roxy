import { type Request, type Response } from 'express'

import {
  type CreateOpenApiNodeHttpHandlerOptions
} from 'trpc-openapi/dist/adapters/node-http/core'
import { type OpenApiRouter } from 'trpc-openapi/dist/types'
import { createOpenApiNodeHttpHandler } from './node-http/core'

export type CreateOpenApiExpressMiddlewareOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiNodeHttpHandlerOptions<TRouter, Request, Response>;

export const createOpenApiExpressMiddleware = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiExpressMiddlewareOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts) // 2022-11-03 @keifufu: Use handler from ./node-http/core.ts

  return async (req: Request, res: Response) => {
    await openApiHttpHandler(req, res)
  }
}