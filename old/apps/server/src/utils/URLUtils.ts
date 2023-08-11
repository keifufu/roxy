import { Env } from './env'
import { parseURL } from './parseURL'

export const URLUtils = {
  makePath: (path: string) => `/${parseURL(Env.instance.get('URL')).path}/${path}`.replace(/\/+/g, '/'),
  makeUrl: (path: string) => {
    const { protocol, host } = parseURL(Env.instance.get('URL'))
    return `${protocol}://${host}${URLUtils.makePath(path)}`
  }
}