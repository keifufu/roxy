import * as geoip from 'geoip-lite'
import * as iso3166 from 'iso-3166-2'

import { type Request } from 'express'
import { nanoid } from 'nanoid'

export function getIpFromRequest(request: Request, returnRandomIfNotFound = false) {
  let ip = request.get('X-Forwarded-For') || request.ip || request.socket.remoteAddress || (returnRandomIfNotFound ? nanoid(12) : 'unknown')
  if (ip.substring(0, 7) === '::ffff:')
    ip = ip.substring(7)
  return ip
}

const userAgentAliases = {
  okhttp: 'Android App'
}

export function getRawUserAgentFromRequest(request: Request) {
  const userAgent = request.get('User-Agent') || 'unknown'
  return userAgent
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#which_part_of_the_user_agent_contains_the_information_you_are_looking_for
export function getParsedUserAgentFromRequest(request: Request): string {
  const userAgent = getRawUserAgentFromRequest(request)
  let alias = userAgent
  Object.keys(userAgentAliases).forEach((key) => {
    if (userAgent.includes(key))
      alias = userAgentAliases[key as keyof typeof userAgentAliases]
  })
  if (userAgent.includes('Firefox/') && !userAgent.includes('Seamonkey/'))
    alias = 'Firefox'
  else if (userAgent.includes('Seamonkey/'))
    alias = 'Firefox'
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Chromium/'))
    alias = 'Chrome'
  else if (userAgent.includes('Chromium/'))
    alias = 'Chromium'
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome/') && !userAgent.includes('Chromium/'))
    alias = 'Safari'
  else if (userAgent.includes('OPR/') || userAgent.includes('Opera/'))
    alias = 'Opera'
  else if (userAgent.includes('; MSIE') || userAgent.includes('Trident/7.0; .*'))
    alias = 'Internet Explorer'
  return alias
}

export function getEstimatedLocationFromRequest(request: Request): string {
  const ip = getIpFromRequest(request)
  const geo = geoip.lookup(ip)
  if (!geo) return 'unknown'
  const iso = iso3166.subdivision(geo.country, geo.region)
  if (!iso) return 'unknown'
  const location = `${geo.city}, ${iso.name}, ${iso.countryName}`
  return location
}

export const getUniqueIdentifierFromRequest = (request: Request): string => `${getIpFromRequest(request)}-${getRawUserAgentFromRequest(request)}`