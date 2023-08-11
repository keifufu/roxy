import { FastifyRequest } from "fastify";
import * as geoip from "geoip-lite";
import * as iso3166 from "iso-3166-2";

import { nanoid } from "nanoid";

export function getIpFromRequest(
  request: FastifyRequest,
  returnRandomIfNotFound = false
) {
  let ip = request.ip || (returnRandomIfNotFound ? nanoid(12) : "unknown");
  if (ip.substring(0, 7) === "::ffff:") ip = ip.substring(7);
  return ip;
}

const userAgentAliases = {
  okhttp: "Android App",
};

export function getRawUserAgentFromRequest(request: FastifyRequest): string {
  const userAgent = (request.headers["user-agent"] as string) || "unknown";
  return userAgent;
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#which_part_of_the_user_agent_contains_the_information_you_are_looking_for
export function getParsedUserAgentFromRequest(request: FastifyRequest): string {
  const userAgent = getRawUserAgentFromRequest(request);
  let alias = userAgent;
  Object.keys(userAgentAliases).forEach((key) => {
    if (userAgent.includes(key))
      alias = userAgentAliases[key as keyof typeof userAgentAliases];
  });
  if (userAgent.includes("Firefox/") && !userAgent.includes("Seamonkey/"))
    alias = "Firefox";
  else if (userAgent.includes("Seamonkey/")) alias = "Firefox";
  else if (userAgent.includes("Chrome/") && !userAgent.includes("Chromium/"))
    alias = "Chrome";
  else if (userAgent.includes("Chromium/")) alias = "Chromium";
  else if (
    userAgent.includes("Safari") &&
    !userAgent.includes("Chrome/") &&
    !userAgent.includes("Chromium/")
  )
    alias = "Safari";
  else if (userAgent.includes("OPR/") || userAgent.includes("Opera/"))
    alias = "Opera";
  else if (
    userAgent.includes("; MSIE") ||
    userAgent.includes("Trident/7.0; .*")
  )
    alias = "Internet Explorer";
  return alias;
}

export function getEstimatedLocationFromRequest(
  request: FastifyRequest
): string {
  const ip = getIpFromRequest(request);
  const geo = geoip.lookup(ip);
  if (!geo) return "unknown";
  const iso = iso3166.subdivision(geo.country, geo.region);
  if (!iso) return "unknown";
  const location = `${geo.city}, ${iso.name}, ${iso.countryName}`;
  return location;
}

export const getUniqueIdentifierFromRequest = (
  request: FastifyRequest
): string =>
  `${getIpFromRequest(request)}-${getRawUserAgentFromRequest(request)}`;
