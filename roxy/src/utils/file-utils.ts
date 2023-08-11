import fs from "node:fs";
import path from "node:path";
import { Config } from "./config";

export const FileUtils = {
  getFolderPath() {
    const dir = path.join(Config.getEnv("dataPath"), "files");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  getFilenamePath: (filename: string) =>
    `${FileUtils.getFolderPath()}/${filename}`,
  getFilePath: (file: Roxy.File) =>
    `${FileUtils.getFolderPath()}/${file.id}.${file.ext}`,
  getFileThumbnailPath: (file: Roxy.File) =>
    `${FileUtils.getFolderPath()}/${file.thumbnailId}.webp`,
  isImage: (file: Pick<Roxy.File, "mimeType">) =>
    file.mimeType.startsWith("image/"),
  isVideo: (file: Pick<Roxy.File, "mimeType">) =>
    file.mimeType.startsWith("video/"),
  isAudio: (file: Pick<Roxy.File, "mimeType">) =>
    file.mimeType.startsWith("audio/"),
  hasThumbnail: (mimeType: string) =>
    FileUtils.isImage({ mimeType }) || FileUtils.isVideo({ mimeType }),
};
