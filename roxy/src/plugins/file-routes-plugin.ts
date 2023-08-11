import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
  RouteGenericInterface,
} from "fastify";
import fp from "fastify-plugin";
import glob from "glob-promise";
import fs from "node:fs";
import path from "node:path";

export type RoxyRoute<T extends RouteGenericInterface = object> = (
  req: FastifyRequest<T>,
  res: FastifyReply,
  fastify: FastifyInstance
) => unknown;

type RouteDefinitions = Partial<Record<HTTPMethods, RoxyRoute<object>>>;

const loadRouteDefinitions = async (
  path: string
): Promise<RouteDefinitions> => {
  const module = await import(path);

  const routeDefinitions: RouteDefinitions = {};
  const valid = ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT", "OPTIONS"];
  Object.keys(module).forEach((key) => {
    if (valid.includes(key.toUpperCase())) {
      routeDefinitions[key as HTTPMethods] = module[key];
    }
  });

  return routeDefinitions;
};

type FileRoutesOptions = {
  routesPath: string;
  prefix?: string;
};

const fileRoutesPlugin: FastifyPluginAsync<FileRoutesOptions> = async (
  fastify,
  opts
) => {
  if (
    !fs.existsSync(opts.routesPath) ||
    !fs.statSync(opts.routesPath).isDirectory()
  ) {
    throw new Error(`'${opts.routesPath}' is not a directory`);
  }

  // glob returns ../../, but windows returns ..\..\
  const dirPath = path.normalize(opts.routesPath).replace(/\\/g, "/");

  const routePaths = await glob(`${dirPath}/**/[!._]!(*.test).{ts,js}`);
  for (const routePath of routePaths) {
    let routeName = routePath
      .replace("[", "{")
      .replace("]", "}")
      .replace(dirPath, "")
      .replace(".js", "")
      .replace(".ts", "")
      .replace("index", "")
      .split("/")
      .map((part) => part.replace(/{(.+)}/g, ":$1"))
      .join("/");

    routeName = !routeName ? "/" : `${opts.prefix || ""}${routeName}`;
    const routeDefinitions = await loadRouteDefinitions(routePath);

    for (const [method, handler] of Object.entries(routeDefinitions)) {
      fastify.route({
        method: method.toUpperCase() as HTTPMethods,
        url: routeName,
        handler: (req, res) => handler(req, res, fastify),
      });
    }
  }
};

export default fp(fileRoutesPlugin);
