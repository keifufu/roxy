import { type Router } from 'express'
import { initBaseRoute } from './base'
import { initUploadRoute } from './upload'

export const initExpressRoutes = (router: Router) => {
  initUploadRoute(router)
  initBaseRoute(router)
}