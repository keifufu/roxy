import argon2, { argon2id } from "argon2";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { StatusCodes } from "http-status-codes";
import { sha256 } from "js-sha256";
import jwt from "jsonwebtoken";
import { RoxyError } from "..";
import { prisma } from "../database/prisma";
import { Config } from "../utils/config";

type JWT = {
  cookie: string;
  jwt: {
    token: string;
    expires: number;
  };
};

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      verifyAuth: () => Promise<{ user: Roxy.User; session: Roxy.Session }>;
      verifySimpleAuth: () => Promise<{
        user: Roxy.User;
        session: Roxy.Session;
      }>;
      verifyRefreshAuth: () => Promise<{
        user: Roxy.User;
        session: Roxy.Session;
      }>;
    };
  }
  interface FastifyInstance {
    auth: {
      signAccessToken: (userId: string) => JWT;
      signRefreshToken: (userId: string) => JWT;
      verifyPassword: (user: Roxy.User, password: string) => Promise<boolean>;
      hashPassword: (password: string) => Promise<string>;
    };
  }
}

type AuthOptions = {
  accessJwtSecret: string;
  accessJwtExpirationSeconds: number;
  refreshJwtSecret: string;
  refreshJwtExpirationSeconds: number;
};

export interface TokenPayload {
  userId: string;
}

function getAccessTokenFromRequest(request: FastifyRequest) {
  let accessToken =
    request.cookies?.Authentication || request.headers?.authorization;
  if (accessToken?.startsWith("Bearer "))
    accessToken = accessToken.split(" ")[1];
  return accessToken ?? "";
}

function getApiKeyFromRequest(request: FastifyRequest) {
  if (request.headers.authorization?.startsWith("ApiKey "))
    return request.headers.authorization.split(" ")[1];
  return null;
}

export function getRefreshTokenFromRequest(request: FastifyRequest): string {
  let refreshToken =
    (request.cookies?.Refresh as string) ||
    (request.headers?.refresh as string);
  if (refreshToken?.startsWith("Bearer "))
    refreshToken = refreshToken.split(" ")[1];
  return refreshToken ?? "";
}

async function getSessionFromRequest(request: FastifyRequest, userId: string) {
  return await prisma.session.findFirst({
    where: {
      userId: userId,
      hashedRefreshToken: sha256(getRefreshTokenFromRequest(request)),
    },
  });
}

const createApiKeySession = (user: Roxy.User): Roxy.Session => ({
  id: "api",
  userId: user.id,
  app: "api",
  ipAddress: "unknown",
  estimatedLocation: "unknown",
  hashedRefreshToken: "unknown",
  isMfaAuthenticated: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const authPlugin: FastifyPluginAsync<AuthOptions> = async (fastify, opts) => {
  fastify.decorateRequest("auth", {
    getter: function getter(this: FastifyRequest) {
      return {
        verifyAuth: async () => {
          const apiKey = getApiKeyFromRequest(this);
          if (apiKey) {
            const user = await prisma.user.findUnique({
              where: { apiKey },
              include: { usage: true, limits: true },
            });
            if (!user)
              throw new RoxyError({
                code: StatusCodes.UNAUTHORIZED,
                message: "No user with given api key found",
              });

            return { user, session: createApiKeySession(user) };
          }

          const accessToken = getAccessTokenFromRequest(this);
          let payload;
          try {
            payload = jwt.verify(
              accessToken,
              opts.accessJwtSecret
            ) as TokenPayload;
          } catch (err) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "Invalid or expired authentication token",
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { usage: true, limits: true },
          });
          if (!user)
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No user with given id found",
            });

          const session = await getSessionFromRequest(this, user.id);
          if (!session)
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No session found",
            });

          // Accept user as authenticated if mfa is not enabled
          // or if they got a JWT from a MFA endpoint
          if (!user.hasMfaEnabled || session.isMfaAuthenticated) {
            return { user, session };
          } else {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "Two factor authentication failed",
            });
          }
        },
        verifySimpleAuth: async () => {
          const apiKey = getApiKeyFromRequest(this);
          if (apiKey) {
            const user = await prisma.user.findUnique({
              where: { apiKey },
              include: { usage: true, limits: true },
            });
            if (!user)
              throw new RoxyError({
                code: StatusCodes.UNAUTHORIZED,
                message: "No user with given api key found",
              });

            return { user, session: createApiKeySession(user) };
          }

          const accessToken = getAccessTokenFromRequest(this);
          let payload;
          try {
            payload = jwt.verify(
              accessToken,
              opts.accessJwtSecret
            ) as TokenPayload;
          } catch (err) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "Invalid or expired authentication token",
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { usage: true, limits: true },
          });

          if (!user) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No user with given id found",
            });
          }

          const session = await getSessionFromRequest(this, user.id);
          if (!session) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No session found",
            });
          }

          /*
           * verifySimpleAuth is only being used on endpoints where a user needs to confirm 2FA of some sort.
           * So if they are already twoFactorAuthenticated then they don't need access to those endpoints anymore
           */
          if (session.isMfaAuthenticated) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "Already two factor authenticated",
            });
          }

          return { user, session };
        },
        verifyRefreshAuth: async () => {
          const refreshToken = getRefreshTokenFromRequest(this);
          let payload;
          try {
            payload = jwt.verify(
              refreshToken,
              opts.refreshJwtSecret
            ) as TokenPayload;
          } catch (err) {
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "Invalid or expired refresh token",
            });
          }

          const session = await getSessionFromRequest(this, payload.userId);
          if (!session)
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No session found",
            });

          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { usage: true, limits: true },
          });
          if (!user)
            throw new RoxyError({
              code: StatusCodes.UNAUTHORIZED,
              message: "No user with given id found",
            });

          return { user, session };
        },
      };
    },
  });

  fastify.decorate("auth", {
    signAccessToken(this: FastifyRequest, userId: string) {
      const payload: TokenPayload = { userId };
      const token = jwt.sign(payload, Config.getSecret("accessJwtSecret"), {
        expiresIn: Config.getSecret("accessJwtExpirationSeconds"),
      });

      return {
        cookie: `Authentication=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Config.getSecret(
          "accessJwtExpirationSeconds"
        )};`,
        jwt: { token, expires: Config.getSecret("accessJwtExpirationSeconds") },
      };
    },
    signRefreshToken(this: FastifyRequest, userId: string) {
      const payload: TokenPayload = { userId };
      const token = jwt.sign(payload, Config.getSecret("refreshJwtSecret"), {
        expiresIn: Config.getSecret("refreshJwtExpirationSeconds"),
      });
      // Note: Path needs to remain "/", we use the refresh token in getSessionFromRequest,
      // which is used basically everywhere, due to being used in JwtTwoFactorGuard
      const cookie = `Refresh=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Config.getSecret(
        "refreshJwtExpirationSeconds"
      )};`;
      return {
        cookie,
        jwt: {
          token,
          expires: Config.getSecret("refreshJwtExpirationSeconds"),
        },
      };
    },
    async verifyPassword(
      this: FastifyRequest,
      user: Roxy.User,
      password: string
    ) {
      try {
        if (await argon2.verify(user.hashedPassword, password)) return true;
        return false;
      } catch (error) {
        throw new RoxyError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Invalid login credentials",
        });
      }
    },
    async hashPassword(this: FastifyRequest, password: string) {
      return await argon2.hash(password, { type: argon2id });
    },
  });
};

export default fp(authPlugin);
