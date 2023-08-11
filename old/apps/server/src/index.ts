import { createExpressMiddleware } from '@trpc/server/adapters/express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import https from 'https'
import path from 'path'
import SwaggerUI from 'swagger-ui-express'
import { generateOpenApiDocument } from 'trpc-openapi'
import { runCleanupTask } from './database/cleanup'
import { initExpressRoutes } from './expressRoutes'
import { isDiscordRequest } from './expressRoutes/base'
import { createContext } from './trpc/context'
import { appRouter } from './trpc/routers/_app'
import { FileUtils } from './utils/FIleUtils'
import { URLUtils } from './utils/URLUtils'
import { Env } from './utils/env'
import { expressSwaggerUiOptions } from './utils/expressSwaggerUiOptions'
import { parseURL } from './utils/parseURL'
import { createOpenApiExpressMiddleware } from './utils/trpc-openapi/express'


export class ExpressError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function main() {
  // Create a OpenAPI document, this allows for the tRPC router to be accessed via HTTP routes
  // and provides great documentation via Swagger UI
  const openApiDocument = generateOpenApiDocument(appRouter, {
    title: `${Env.instance.get('NAME')} API`,
    version: '0.0.1-dev',
    baseUrl: `${Env.instance.get('URL')}/api`
  })

  const app = express()

  // Set the base path
  const router = express.Router()
  app.use(parseURL(Env.instance.get('URL')).path, router)

  // Express config
  app.set('view engine', 'ejs')
  app.set('views', path.resolve('./src/views'))
  app.disable('x-powered-by')
  app.set('trust proxy', Env.instance.get('IS_PROXIED'))

  // Router middleware
  router.use(helmet())
  router.use(helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
      upgradeInsecureRequests: null
    }
  }))
  router.use(cookieParser())
  router.use(cors({
    allowedHeaders: ['Accept', 'Authorization', 'Refresh', 'Origin', 'Content-Type'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    origin: (origin, callback) => callback(null, true)
  }))

  // Routes
  app.get('*', (req, res) => res.redirect(URLUtils.makePath('/app')))
  router.use((req, res, next) => {
    if (req.path.includes('/files') || req.path.includes('/assets') || req.path.includes('/api/docs') || isDiscordRequest(req)) {
      res.setHeader('Cache-Control', 'max-age=2592000') // 30 Days
      res.setHeader('Expires', '2592000')
    } else {
      // Required to track clicks and such
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    }
    next()
  })
  router.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }))
  router.use('/api/docs', SwaggerUI.serve, SwaggerUI.setup(openApiDocument, expressSwaggerUiOptions))
  router.get('/api', (_, res) => res.redirect(URLUtils.makePath('/api/docs')))
  router.use('/api/', createOpenApiExpressMiddleware({ router: appRouter, createContext }))
  router.use('/app/assets', express.static(path.resolve('../web/dist/assets')))
  router.get('/app', (_, res) => res.sendFile(path.resolve('../web/dist/index.html')))
  router.get('/app/*', (_, res) => res.sendFile(path.resolve('../web/dist/index.html')))
  router.use('/assets', express.static(path.resolve('./src/assets')))
  router.use('/files', express.static(FileUtils.getFolderPath()))
  initExpressRoutes(router) // More complex routes are in /expressRoutes

  // Error handler
  const errorHandler: ErrorRequestHandler = (err: ExpressError | null, req, res, next) => {
    if (!err) return next()
    res.status(err.status || 500)
    res.render('error', {
      statusCode: err.status || 500,
      message: err.message || 'Unknown error :('
    })
    res.end()
  }
  app.use(errorHandler)

  // Start the server
  if (Env.instance.get('USE_HTTPS')) {
    const key = Env.instance.get('SSL_KEY_PATH')
    const cert = Env.instance.get('SSL_CERT_PATH')
    if (!key || !cert) {
      console.log('SSL_KEY_PATH and SSL_CERT_PATH must be set to use HTTPS')
      return
    }
    const httpsServer = https.createServer({ key, cert }, app)
    httpsServer.listen(Env.instance.get('PORT'), () => {
      console.log(`[HTTPS] Listening on port ${Env.instance.get('PORT')}; Accessible at ${Env.instance.get('URL')}`)
    })
  } else {
    app.listen(Env.instance.get('PORT'), () => {
      console.log(`[HTTP] Listening on port ${Env.instance.get('PORT')}; Accessible at ${Env.instance.get('URL')}`)
    })
  }
}

try {
  main()
  // Run database cleanup every hour
  // This will delete expired users, sessions, etc.
  setInterval(() => {
    runCleanupTask()
  }, 60 * 60 * 1000)
} catch (err) {
  console.error(`[MAIN ERROR]: ${err}`)
}