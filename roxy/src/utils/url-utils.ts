import { Config } from "./config";
import { parseURL } from "./parse-url";

export const URLUtils = {
  // Example: /prefix/<path>
  makePath: (path: string) =>
    `/${parseURL(Config.get("url")).path}/${path}`.replace(/\/+/g, "/"),
  // Example: https://domain.com/prefix/<path>
  makeUrl: (path: string) => {
    const { protocol, host } = parseURL(Config.get("url"));
    return `${protocol}://${host}${URLUtils.makePath(path)}`;
  },
  // Example: https://domain.com/assets/<asset>
  makeAsset: (asset: string) => {
    const { protocol, host } = parseURL(Config.get("url"));
    return `${protocol}://${host}${URLUtils.makePath(`assets/${asset}`)}`;
  },
};
