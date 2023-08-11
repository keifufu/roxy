import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { isBotRequest } from "../utils/request-utils";

const cachePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (req, res) => {
    if (
      req.url.includes("/files") ||
      req.url.includes("/assets") ||
      isBotRequest(req)
    ) {
      res.header("Cache-Control", "max-age=2592000"); // 30 Days
      res.header("Expires", "2592000");
    } else {
      // Required to track clicks and such
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.header("Pragma", "no-cache");
      res.header("Expires", "0");
    }
  });
};

export default fp(cachePlugin);
