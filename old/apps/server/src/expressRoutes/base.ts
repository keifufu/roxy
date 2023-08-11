import { type Request, type Router } from 'express'
import { ExpressError } from '..'
import { prisma } from '../database/prisma'
import { createExpressRateLimitMiddleware } from '../trpc/middleware/RateLimitGuard'
import { FileUtils } from '../utils/FIleUtils'
import { URLUtils } from '../utils/URLUtils'
import { getEstimatedLocationFromRequest, getIpFromRequest, getRawUserAgentFromRequest, getUniqueIdentifierFromRequest } from '../utils/trackingUtils'

export const isDiscordRequest = (request: Request) => {
  const userAgent = getRawUserAgentFromRequest(request)
  if (userAgent === 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)') return true
  if (userAgent === 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.6; rv:92.0) Gecko/20100101 Firefox/92.0') return true // Dunno why but they use this
  return false
}

// Store to prevent one user from creating more than 1 click per 60 seconds
class ClickStore {
  store: Map<string, boolean>

  constructor() {
    this.store = new Map<string, boolean>()
  }

  setClicked(key: string) {
    this.store.set(key, true)
    setTimeout(() => this.store.delete(key), 60000)
  }

  isAllowed(key: string) {
    return !this.store.has(key)
  }
}
const clickStore = new ClickStore()

export const initBaseRoute = (router: Router) => {
  router.use('/',
    createExpressRateLimitMiddleware({ rateLimit: { max: 3, windowS: 1 } }),
    async (req, res, next) => {
      if (req.path === '/') return res.redirect(URLUtils.makePath('/app'))
      const key = req.path.replaceAll('/', '').split('?')[0].split('#')[0].split('.')[0]

      const addClick = async () => {
        if (!isDiscordRequest(req) && clickStore.isAllowed(getUniqueIdentifierFromRequest(req))) {
          clickStore.setClicked(getUniqueIdentifierFromRequest(req))
          await prisma.uniqueKey.update({ where: { key },
            data: {
              clickCount: { increment: 1 },
              clicks: {
                create: {
                  ipAddress: getIpFromRequest(req),
                  location: getEstimatedLocationFromRequest(req),
                  userAgent: getRawUserAgentFromRequest(req)
                }
              }
            } }).catch(() => null)
        }
      }

      const uniqueKey = await prisma.uniqueKey.findFirst({ where: { key }, include: { UrlShortener: true, Paste: true, File: { include: { uniqueKey: true } } } })
      if (uniqueKey?.UrlShortener) {
        const urlShortener = uniqueKey.UrlShortener

        // Throw error if URL has reached max clicks
        if (urlShortener.maxClicks && uniqueKey.clickCount >= urlShortener.maxClicks)
          return next(new ExpressError(403, 'The URL has reached its maximum amount of clicks; Check back later!'))

        // The URL has no expiration date set if it's unlimited length
        if (urlShortener.expirationDate && urlShortener.expirationDate < new Date())
          return next(new ExpressError(403, 'This URL has expired'))

        await addClick()
        return res.redirect(urlShortener.destinationUrl)
      } else if (uniqueKey?.Paste) {
        const paste = uniqueKey.Paste
        await addClick()
        res.render('paste', {
          title: paste.title,
          content: paste.content
        })
        return res.end()
      } else if (uniqueKey?.File) {
        const file = uniqueKey.File
        await addClick()

        if (FileUtils.isImage(file)) {
          if (isDiscordRequest(req))
            return res.redirect(URLUtils.makePath(`/files/${file.id}.${file.ext}`))

          res.render('image', {
            filename: file.filename,
            size: humanFileSize(file.bytes),
            url: URLUtils.makePath(`/files/${file.id}.${file.ext}`)
          })

          return res.end()
        } else if (FileUtils.isVideo(file)) {
          res.render('video', {
            filename: file.filename,
            size: humanFileSize(file.bytes),
            url: URLUtils.makePath(`/files/${file.id}.${file.ext}`),
            ogVideoUrl: URLUtils.makeUrl(`/files/${file.id}.${file.ext}`),
            ogImageUrl: URLUtils.makeUrl(`/files/${file.thumbnailId}.webp`)
          })
          return res.end()
        } else if (FileUtils.isAudio(file)) {
          // audio
        } else {
          // any other file
        }

        // res.render(imageType, {
        //   key,
        //   filename: file.filename,
        //   size: humanFileSize(file.bytes),
        //   url: URLUtils.makePath(`/files/${file.id}.${file.ext}`)
        // })
        // res.end()
      }

      res.status(404)
      res.render('404', {
        appPath: URLUtils.makePath('/app')
      })
      res.end()
    })
}

function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh)
    return bytes + ' B'


  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    // eslint-disable-next-line no-param-reassign
    bytes /= thresh
    // eslint-disable-next-line no-plusplus
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)


  return bytes.toFixed(dp) + ' ' + units[u]
}