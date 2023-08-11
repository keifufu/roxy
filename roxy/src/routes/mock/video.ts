import { RoxyRoute } from "../../plugins/file-routes-plugin";
import { VideoPage } from "../../views/pages/Video/Video";

export const get: RoxyRoute = (req, res) => {
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
};
