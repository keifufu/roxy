import { RoxyRoute } from "../../plugins/file-routes-plugin";
import { PastePage } from "../../views/pages/Paste/Paste";

export const get: RoxyRoute = (req, res) => {
  res.jsxte(PastePage, {
    paste: {
      bytes: 0,
      createdAt: new Date(),
      id: "",
      uniqueKey: {
        clickCount: 0,
        id: "",
        key: "awd",
        userId: "",
      },
      uniqueKeyId: "awd",
      updatedAt: new Date(),
      userId: "awd",
      title: "hello",
      content: `
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
  styleSrc: ["'self'"],
},
},
});
fastify.register(import("@fastify/cookie"), {
secret: Config.getSecret("cookie"),
hook: "onRequest",
parseOptions: {},
});
`,
    },
  });
};
