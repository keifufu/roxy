import { StatusCodes } from "http-status-codes";
import { sha256 } from "js-sha256";
import { customAlphabet } from "nanoid";
import crypto from "node:crypto";
import { z } from "zod";
import { RoxyError } from "../../..";
import { prisma } from "../../../database/prisma";
import { DTO } from "../../../database/types";
import { RoxyRoute } from "../../../plugins/file-routes-plugin";
import { Config } from "../../../utils/config";
import {
  getEstimatedLocationFromRequest,
  getIpFromRequest,
  getRawUserAgentFromRequest,
} from "../../../utils/tracking-utils";

const InputDTO = z.object({
  username: DTO.username,
  password: DTO.password,
});

const OutputDTO = z.object({
  user: DTO.User,
  session: DTO.Session,
  accessJwt: DTO.JWT,
  refreshJwt: DTO.JWT,
});

export const createApiKey = () => crypto.randomBytes(32).toString("hex");
function generateMfaBackupCode() {
  const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");
  return nanoid(8);
}
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const post: RoxyRoute = async (req, res, fastify) => {
  const body = req.zod.parseBody(InputDTO);

  if (!Config.get("allowRegistrations")) {
    throw new RoxyError({
      code: StatusCodes.FORBIDDEN,
      message: "Registrations are currently disabled",
    });
  }

  const mfaBackupCodes: string[] = [];
  for (let i = 0; i < 10; i++) mfaBackupCodes.push(generateMfaBackupCode());

  const isFirstUser = (await prisma.user.count()) === 0;

  const hashedPassword = await fastify.auth.hashPassword(body.password);
  const { user, session, jwtAccessToken, jwtRefreshToken } = await prisma
    .$transaction(async (tc) => {
      const user = await tc.user
        .create({
          data: {
            username: body.username,
            hashedPassword: hashedPassword,
            mfaBackupCodes: mfaBackupCodes.join(","),
            apiKey: createApiKey(),
            isAdministrator: isFirstUser,
            usage: { create: {} },
            limits: {
              create: {
                totalMB: Config.get("defaultLimitsTotalMb"),
                customUrls: Config.get("defaultLimitsCustomUrls"),
              },
            },
          },
          include: { limits: true, usage: true },
        })
        .catch((err) => {
          throw new RoxyError({
            code: StatusCodes.BAD_REQUEST,
            message: `${capitalizeFirstLetter(
              err.meta.target[0]
            )} is already in use`,
          });
        });

      const jwtAccessToken = fastify.auth.signAccessToken(user.id);
      const jwtRefreshToken = fastify.auth.signRefreshToken(user.id);

      const session = await tc.session
        .create({
          data: {
            user: {
              connect: {
                id: user.id,
              },
            },
            // using sha256 here because we need the output of the hash to always be the same
            hashedRefreshToken: sha256(jwtRefreshToken.jwt.token),
            app: getRawUserAgentFromRequest(req),
            estimatedLocation: getEstimatedLocationFromRequest(req),
            ipAddress: getIpFromRequest(req),
          },
        })
        .catch(() => {
          throw new RoxyError({
            code: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to create session",
          });
        });

      return { user, session, jwtAccessToken, jwtRefreshToken };
    })
    .catch((err) => {
      if (err instanceof RoxyError) throw err;
      throw new RoxyError({
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to create user",
      });
    });

  res.header("Set-Cookie", [jwtAccessToken.cookie, jwtRefreshToken.cookie]);

  res.zod.send(OutputDTO, {
    user,
    session,
    accessJwt: jwtAccessToken.jwt,
    refreshJwt: jwtRefreshToken.jwt,
  });
};
