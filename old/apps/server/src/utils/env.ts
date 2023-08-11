import crypto from 'node:crypto'
import fs from 'node:fs'
import { z } from 'zod'

let secrets = {
  access: crypto.randomBytes(64).toString('hex'),
  refresh: crypto.randomBytes(64).toString('hex')
}

if (fs.existsSync('.secrets')) secrets = JSON.parse(fs.readFileSync('.secrets', 'utf8'))
else fs.writeFileSync('.secrets', JSON.stringify(secrets))

export const JWT_ACCESS_TOKEN_SECRET = secrets.access
export const JWT_ACCESS_TOKEN_EXPIRATION_TIME = 900 // 900 seconds = 15 Minutes
export const JWT_REFRESH_TOKEN_SECRET = secrets.refresh
export const JWT_REFRESH_TOKEN_EXPIRATION_TIME = 2419200 // 2419200 = 30 Days

export const GLOBAL_RATE_LIMIT_PER_SECOND = 1000

const loadEnvFile = (filepath: string) => {
  const content = fs.readFileSync(filepath, 'utf8')
  return content.trim().split(/\r?\n/u).reduce((result: any, elem) => {
    let line = elem.trim()
    if (!line || line.startsWith('#'))
      return result

    // Inline comments; For simple values:
    // key=value # comment
    // For values with a hashtag in them:
    // key="valueWith#" # comment
    // let line = rawLine.split('#')[0].trim()
    const _splitIndex = line.indexOf('=')
    const _key = line.substring(0, _splitIndex).trim()
    const _value = line.substring(_splitIndex + 1).trim()
    if (_value.startsWith('"') && _value.split('"').length === 3)
      line = `${_key}=${_value.split('"')[1]}`
    else
      line = line.split('#')[0]

    const splitIndex = line.indexOf('=')
    const key = line.substring(0, splitIndex).trim()
    const value = line.substring(splitIndex + 1).trim()

    if (!key)
      throw new Error(`Missing key for environment variable in ${filepath}`)

    result[key] = (value.startsWith('\'') && value.endsWith('\'')) ? value.slice(1, -1) : value
    return result
  }, {})
}

const readEnv = (validator: z.ZodObject<any, any>) => {
  const _env = loadEnvFile('.env')
  const _res = validator.safeParse(_env)
  if (!_res.success) {
    _res.error.issues.forEach((issue) => {
      if (issue.code === 'invalid_type') {
        if (issue.expected === 'number')
          _env[issue.path[0]] = Number(_env[issue.path[0]])
        else if (issue.expected === 'boolean')
          _env[issue.path[0]] = _env[issue.path[0]] === 'true'
      }
    })
  }
  const res = validator.safeParse(_env)
  if (!res.success) {
    res.error.issues.forEach((issue) => {
      if (issue.code === 'invalid_type')
        console.error(`ERROR: Environment variable '${issue.path.join('.')}' is not a ${issue.expected}!`)
      process.exit(1)
    })
  }

  return _env
}

// =========== EDIT THIS ===========

const validator = z.object({
  NAME: z.string(),
  URL: z.string(),
  PORT: z.number(),
  USE_HTTPS: z.boolean(),
  SSL_CERT_PATH: z.string().nullable(),
  SSL_KEY_PATH: z.string().nullable(),
  IS_PROXIED: z.boolean(),
  ALLOW_REGISTRATIONS: z.boolean(),
  DEFAULT_LIMITS_TOTAL_MB: z.number(),
  DEFAULT_LIMITS_CUSTOM_URLS: z.number(),
  URL_SHORTENER_KEY_LENGTH: z.number(),
  PASTE_KEY_LENGTH: z.number(),
  FILE_KEY_LENGTH: z.number()
})

// =========== EDIT THIS ===========

export class Env {
  private static _instance: Env
  private env: z.infer<typeof validator>

  private constructor() {
    this.env = readEnv(validator)
  }

  static get instance(): Env {
    if (!Env._instance)
      Env._instance = new Env()

    return Env._instance
  }

  get<T extends keyof z.infer<typeof validator>>(k: T) {
    return this.env[k]
  }
}