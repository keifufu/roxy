const fs = require('node:fs')
const { parse } = require('jsonc-parser')

const config = parse(fs.readFileSync('config.jsonc', 'utf-8'))

const parseURL = (url) => {
  const parsedUrl = new URL(url)
  return {
    protocol: parsedUrl.protocol.replace(':', ''),
    domain: parsedUrl.hostname,
    path: parsedUrl.pathname
  }
}

const webEnv = `
VITE_NAME=${config.name}
VITE_TRPC_URL=${config.url}/api/trpc
VITE_BASE=${`${parseURL(config.url).path}/app`.replace(/\/+/g, '/')}
`
fs.writeFileSync('apps/web/.env', webEnv)

const serverEnv = `
NAME=${config.name}
URL=${config.url}
PORT=${config.port}
USE_HTTPS=${config.https}
SSL_CERT_PATH=${config.sslCertPath}
SSL_KEY_PATH=${config.sslKeyPath}
IS_PROXIED=${config.isProxied}
ALLOW_REGISTRATIONS=${config.allowRegistrations}
DEFAULT_LIMITS_TOTAL_MB=${config.totalMB}
DEFAULT_LIMITS_CUSTOM_URLS=${config.customUrls}
URL_SHORTENER_KEY_LENGTH=${config.urlShortenerKeyLength}
PASTE_KEY_LENGTH=${config.pasteKeyLength}
FILE_KEY_LENGTH=${config.fileKeyLength}
`
fs.writeFileSync('apps/server/.env', serverEnv)

console.log('\x1b[36m%s\x1b[0m', 'Successfully updated config. Restart the server to apply.')