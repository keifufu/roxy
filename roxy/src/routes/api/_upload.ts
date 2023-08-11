// import { File } from "@prisma/client";
// import { Router } from "express";
// import ffmpeg from "fluent-ffmpeg";
// import mime from "mime-types";
// import multer from "multer";
// import fs from "node:fs";
// import os from "node:os";
// import sharp from "sharp";
// import { ExpressError } from "../..";
// import { prisma } from "../../database/prisma";
// import { apiKeyMiddleware } from "../../plugins/api-key-middleware";
// import { Config } from "../../utils/config";
// import { FileUtils } from "../../utils/file-utils";
// import { getUniqueKey } from "../../utils/get-unique-key";
// import { recalculateUserLimits } from "../../utils/recalculate-user-limits";
// import { URLUtils } from "../../utils/url-utils";

// const upload = multer({
//   dest: os.tmpdir(),
// });

// const registerApiUpload = (router: Router) => {
//   router.post(
//     "/upload",
//     apiKeyMiddleware,
//     upload.single("file"),
//     async (req, res, next) => {
//       if (!req.user_express) return next(new ExpressError(401, "Unauthorized"));
//       if (!req.file) return next(new ExpressError(400, "No file provided"));

//       const { originalname, mimetype, size, path } = req.file;
//       const ext = mime.extension(mimetype);
//       if (!ext) return next(new ExpressError(400, "Invalid mime type"));

//       const mb =
//         req.user_express.usage.bytesUsed / 1024 / 1024 + size / 1024 / 1024;
//       if (
//         mb > req.user_express.limits.totalMB &&
//         !req.user_express.isAdministrator
//       )
//         return next(
//           new ExpressError(
//             400,
//             `Reached the upload limit (${req.user_express.limits.totalMB} MB)`
//           )
//         );

//       const key = await getUniqueKey(Config.get("fileKeyLength"));
//       if (!key)
//         return next(new ExpressError(500, "Failed to create a new key"));

//       // Replace original ext with mime-inferred ext. This is to replace jpg with jpeg etc.
//       const filename = `${originalname.split(".").slice(0, -1)}.${ext}`;

//       let file = await prisma.file
//         .create({
//           data: {
//             // undefined will make prisma generate a uuid for this
//             thumbnailId: FileUtils.hasThumbnail(mimetype) ? undefined : null,
//             uniqueKey: { create: { key, userId: req.user_express.id } },
//             userId: req.user_express.id,
//             filename,
//             ext,
//             mimeType: mimetype,
//             bytes: size,
//           },
//           include: { uniqueKey: true },
//         })
//         .catch(() => {
//           throw new Error("Failed to create File");
//         });

//       fs.copyFileSync(path, FileUtils.getFilePath(file));
//       fs.rmSync(path);

//       if (file.thumbnailId) {
//         const bytes = await createThumbnail(file);
//         file = await prisma.file.update({
//           where: { id: file.id },
//           data: { thumbnailBytes: bytes },
//           include: { uniqueKey: true },
//         });
//       }

//       recalculateUserLimits(req.user_express.id);

//       return res.json({
//         file,
//         url: URLUtils.makeUrl(`${file.uniqueKey.key}.${file.ext}`),
//       });
//     }
//   );
// };

// async function createThumbnail(file: File) {
//   const path = FileUtils.getFilePath(file);
//   const thumbnailPath = FileUtils.getFileThumbnailPath(file);
//   if (!fs.existsSync(path) || fs.existsSync(thumbnailPath)) return 0;

//   if (FileUtils.isImage(file)) {
//     await sharp(path)
//       .resize(300, 200, {
//         kernel: sharp.kernel.nearest,
//         fit: "cover",
//       })
//       .webp({ nearLossless: true })
//       .toFile(thumbnailPath);
//   } else if (FileUtils.isVideo(file)) {
//     await videoThumbnail(path, thumbnailPath);
//   }

//   return fs.statSync(thumbnailPath).size;
// }

// function videoThumbnail(path: string, thumbnailPath: string) {
//   return new Promise((resolve) => {
//     ffmpeg(path)
//       .thumbnail({
//         count: 1,
//         timestamps: ["00:00:00"],
//         filename: thumbnailPath,
//       })
//       .on("end", resolve);
//   });
// }

// export default registerApiUpload;
