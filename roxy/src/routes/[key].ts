import { StatusCodes } from "http-status-codes";
import { RoxyError } from "..";
import { prisma } from "../database/prisma";
import { RoxyRoute } from "../plugins/file-routes-plugin";
import { FileUtils } from "../utils/file-utils";
import { isBotRequest } from "../utils/request-utils";
import {
  getEstimatedLocationFromRequest,
  getIpFromRequest,
  getRawUserAgentFromRequest,
  getUniqueIdentifierFromRequest,
} from "../utils/tracking-utils";
import { URLUtils } from "../utils/url-utils";
import { AudioPage } from "../views/pages/Audio/Audio";
import { FilePage } from "../views/pages/File/File";
import { ImagePage } from "../views/pages/Image/Image";
import NotFoundPage from "../views/pages/NotFound/NotFound";
import { PastePage } from "../views/pages/Paste/Paste";
import { VideoPage } from "../views/pages/Video/Video";

// Store to prevent one user from creating more than 1 click per 60 seconds
class ClickStore {
  store: Map<string, boolean>;

  constructor() {
    this.store = new Map<string, boolean>();
  }

  setClicked(key: string) {
    this.store.set(key, true);
    setTimeout(() => this.store.delete(key), 60000);
  }

  isAllowed(key: string) {
    return !this.store.has(key);
  }
}
const clickStore = new ClickStore();

export const get: RoxyRoute<{ Params: { key: string } }> = async (req, res) => {
  const addClick = async () => {
    if (
      !isBotRequest(req) &&
      clickStore.isAllowed(getUniqueIdentifierFromRequest(req))
    ) {
      clickStore.setClicked(getUniqueIdentifierFromRequest(req));
      await prisma.uniqueKey
        .update({
          where: { key: req.params.key },
          data: {
            clickCount: { increment: 1 },
            clicks: {
              create: {
                ipAddress: getIpFromRequest(req),
                location: getEstimatedLocationFromRequest(req),
                userAgent: getRawUserAgentFromRequest(req),
              },
            },
          },
        })
        .catch(() => null);
    }
  };

  const uniqueKey = await prisma.uniqueKey.findFirst({
    where: { key: req.params.key },
    include: {
      UrlShortener: { include: { uniqueKey: true } },
      Paste: { include: { uniqueKey: true } },
      File: { include: { uniqueKey: true } },
    },
  });
  if (uniqueKey?.UrlShortener) {
    const urlShortener = uniqueKey.UrlShortener;

    // Throw error if URL has reached max clicks
    if (
      urlShortener.maxClicks &&
      uniqueKey.clickCount >= urlShortener.maxClicks
    )
      throw new RoxyError({
        code: StatusCodes.FORBIDDEN,
        message:
          "The URL has reached its maximum amount of clicks. Check back later!",
      });

    // The URL has no expiration date set if it's unlimited length
    if (
      urlShortener.expirationDate &&
      urlShortener.expirationDate < new Date()
    ) {
      throw new RoxyError({
        code: StatusCodes.FORBIDDEN,
        message: "This URL has expired",
      });
    }
  } else if (uniqueKey?.Paste) {
    const paste = uniqueKey.Paste;
    await addClick();
    return res.jsxte(PastePage, { paste });
  } else if (uniqueKey?.File) {
    const file = uniqueKey.File;
    await addClick();

    if (FileUtils.isImage(file)) {
      if (isBotRequest(req))
        return res.redirect(URLUtils.makePath(`/files/${file.id}.${file.ext}`));

      return res.jsxte(ImagePage, { file });
    } else if (FileUtils.isVideo(file)) {
      return res.jsxte(VideoPage, { file });
    } else if (FileUtils.isAudio(file)) {
      return res.jsxte(AudioPage, { file });
    } else {
      return res.jsxte(FilePage, { file });
    }
  }

  res.jsxte(VideoPage, {
    file: {
      bytes: 0,
      ext: "mp4",
      filename: "video2.mp4",
      id: "",
      mimeType: "video/mp4",
      thumbnailBytes: 0,
      thumbnailId: "",
      uniqueKey: {
        clickCount: 0,
        id: "",
        key: "",
        userId: "",
      },
      uniqueKeyId: "",
      userId: "",
    },
  });
  return;
  // res.jsxte(NotFoundPage, {});
};
