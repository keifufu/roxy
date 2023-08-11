import { RoxyRoute } from "../../plugins/file-routes-plugin";
import { isBotRequest } from "../../utils/request-utils";
import { URLUtils } from "../../utils/url-utils";
import { ImagePage } from "../../views/pages/Image/Image";

export const get: RoxyRoute = (req, res) => {
  if (isBotRequest(req))
    return res.redirect(URLUtils.makePath(`/files/image.png`));

  res.jsxte(ImagePage, {
    file: {
      bytes: 0,
      ext: "png",
      filename: "image.png",
      id: "",
      mimeType: "image/png",
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
};
