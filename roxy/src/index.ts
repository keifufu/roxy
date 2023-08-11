import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import fs from "node:fs";
import path from "node:path";
import { runCleanupTask } from "./database/cleanup";
import "./database/types";
import { Config } from "./utils/config";
import { FileUtils } from "./utils/file-utils";
import { Logger } from "./utils/logger";
import { parseURL } from "./utils/parse-url";
import { URLUtils } from "./utils/url-utils";
import ErrorPage from "./views/pages/Error/Error";
import NotFoundPage from "./views/pages/NotFound/NotFound";
import RateLimitPage from "./views/pages/RateLimit/RateLimit";

async function main() {
  const fastify = Fastify({
    https: Config.get("useHttps")
      ? {
          key: fs.readFileSync(Config.get("sslKeyPath") as string),
          cert: fs.readFileSync(Config.get("sslCertPath") as string),
        }
      : null,
    trustProxy: Config.get("isProxied"),
  });

  // Custom plugins
  fastify.register(import("./plugins/rate-limit-plugin"), {
    exceptions: ["assets", "favicon"],
    max: Config.get("globalRateLimitPerSecond"),
    windowS: 1,
  });
  fastify.register(import("./plugins/auth-plugin"), {
    accessJwtSecret: Config.getSecret("accessJwtSecret"),
    accessJwtExpirationSeconds: Config.getSecret("accessJwtExpirationSeconds"),
    refreshJwtSecret: Config.getSecret("refreshJwtSecret"),
    refreshJwtExpirationSeconds: Config.getSecret(
      "refreshJwtExpirationSeconds"
    ),
  });

  fastify.register(import("./plugins/cache-plugin"));
  fastify.register(import("./plugins/zod-plugin"));
  fastify.register(import("./plugins/jsxte-plugin"));

  // Third party plugins
  fastify.register(import("@fastify/cors"), {
    allowedHeaders: [
      "Accept",
      "Authorization",
      "Refresh",
      "Origin",
      "Content-Type",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    origin: (origin, callback) => callback(null, true),
  });
  fastify.register(import("@fastify/helmet"), {
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });
  fastify.register(import("@fastify/cookie"), {
    secret: Config.getSecret("cookie"),
    hook: "onRequest",
    parseOptions: {},
  });

  // Routes
  const appRouter = async (fastify: FastifyInstance) => {
    // Redirect / to /app
    fastify.get("/", (req, res) => res.redirect(URLUtils.makeUrl("/app")));

    fastify.get("/stream/:filename", (req, res) => {
      const videoPath = FileUtils.getFilenamePath("video2.mp4");
      const videoSize = fs.statSync(videoPath).size;
      const range = req.headers.range;

      if (range) {
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
        const contentLength = end - start + 1;
        const stream = fs.createReadStream(videoPath, { start, end });

        res.header("Content-Range", `bytes ${start}-${end}/${videoSize}`);
        res.header("Accept-Ranges", "bytes");
        res.header("Content-Length", contentLength);
        res.header("Content-Type", "video/mp4");
        res.status(206).send(stream);
      } else {
        res.code(404).send("/stream only supports range requests");
        // const stream = fs.createReadStream(videoPath);
        // res.header("Content-Length", videoSize);
        // res.header("Content-Type", "video/mp4");
        // res.status(200).send(stream);
      }
    });

    // Register all routes in ./routes
    fastify.register(import("./plugins/file-routes-plugin"), {
      routesPath: path.resolve("./src/routes"),
    });

    // Serve static files in /assets
    fastify.register(import("@fastify/static"), {
      root: path.resolve("./src/views/assets"),
      prefix: "/assets",
    });

    // Serve css and js files from ./views
    fastify.get(
      "/assets/:type/:file",
      (
        req: FastifyRequest<{ Params: { type: string; file: string } }>,
        res
      ) => {
        if (!["js", "css"].includes(req.params.type)) {
          return res.code(404).send();
        }
        const mime =
          req.params.type === "js" ? "application/javascript" : "text/css";

        const p = path.join(path.resolve("./src/views/pages"), req.params.file);
        if (fs.existsSync(p)) {
          const stream = fs.createReadStream(
            path.join(p, `index.${req.params.type}`)
          );
          res.type(mime).send(stream);
        } else {
          const p = path.join(
            path.resolve("./src/views/components"),
            req.params.file
          );
          if (fs.existsSync(p)) {
            const stream = fs.createReadStream(
              path.join(p, `index.${req.params.type}`)
            );
            res.type(mime).send(stream);
          } else {
            res.code(404).send();
          }
        }
      }
    );

    // Serve uploaded files
    fastify.register(import("@fastify/static"), {
      root: FileUtils.getFolderPath(),
      prefix: "/files",
      decorateReply: false,
    });
  };
  // Register app router to apply global prefix
  fastify.register(appRouter, { prefix: parseURL(Config.get("url")).path });

  // 404 Handler
  fastify.setNotFoundHandler((req, res) => {
    res.jsxte(NotFoundPage, {});
  });

  // Error handler
  fastify.setErrorHandler(async (error: RoxyError | Error, req, res) => {
    // Respond with json for api requests, otherwise render error template
    // TODO: maybe only show the message if it's RoxyError, otherwise it might contain
    // information we don't want to send

    if (req.routerPath.includes("api")) {
      if (error instanceof RoxyError) {
        res.code(error.code || 500).send({
          message: error.message,
          errors: error.zodErrors ?? undefined,
        });
      } else {
        res.code(500).send({ message: "An unexpected error occurred" });
      }
    } else {
      if (error instanceof RoxyError) {
        if (res.statusCode === StatusCodes.TOO_MANY_REQUESTS) {
          res.code(error.code).jsxte(RateLimitPage, {});
        } else {
          res.code(error.code).jsxte(ErrorPage, {
            code: error.code,
            message: error.message,
          });
        }
      } else {
        console.log(error);
        res.jsxte(ErrorPage, {
          code: 500,
          message: "An unexpected error occurred",
        });
      }
    }
  });

  // Start server
  await fastify.listen({ host: "0.0.0.0", port: Config.get("port") });
  Logger.log(
    `Listening on port ${Config.get("port")}; Accessible at ${Config.get(
      "url"
    )}`
  );
}

export type RoxyZodErrors = {
  [key: string]: string;
};

export class RoxyError extends Error {
  code: StatusCodes;
  zodErrors?: RoxyZodErrors;

  constructor(props: {
    code: StatusCodes;
    message: string;
    zodErrors?: RoxyZodErrors;
  }) {
    super(props.message);
    this.code = props.code;
    this.zodErrors = props.zodErrors;
    Error.captureStackTrace(this, this.constructor);
  }
}

main();
// Run database cleanup every hour
// This will delete expired users, sessions, etc.
setInterval(() => {
  runCleanupTask();
}, 60 * 60 * 1000);
