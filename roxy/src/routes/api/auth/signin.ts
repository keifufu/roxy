import { StatusCodes } from "http-status-codes";
import { sha256 } from "js-sha256";
import { z } from "zod";
import { RoxyError } from "../../..";
import { prisma } from "../../../database/prisma";
import { DTO } from "../../../database/types";
import { getRefreshTokenFromRequest } from "../../../plugins/auth-plugin";
import { RoxyRoute } from "../../../plugins/file-routes-plugin";
import {
  getEstimatedLocationFromRequest,
  getIpFromRequest,
  getRawUserAgentFromRequest,
} from "../../../utils/tracking-utils";

const InputDTO = z.object({
  username: DTO.username,
  password: DTO.password,
  cancelDeletion: z.boolean().optional(),
});

const OutputDTO = z.object({
  user: DTO.User,
  session: DTO.Session,
  accessJwt: DTO.JWT,
  refreshJwt: DTO.JWT,
});

export const post: RoxyRoute = async (req, res, fastify) => {
  const body = req.zod.parseBody(InputDTO);

  const user = await prisma.user.findUnique({
    where: { username: body.username },
    include: { usage: true, limits: true },
  });
  if (!user)
    throw new RoxyError({
      code: StatusCodes.BAD_REQUEST,
      message: "Invalid credentials",
    });

  const validPassword = await fastify.auth
    .verifyPassword(user, body.password)
    .catch(() => {
      throw new RoxyError({
        code: StatusCodes.BAD_REQUEST,
        message: "Invalid credentials",
      });
    });

  if (!validPassword)
    throw new RoxyError({
      code: StatusCodes.BAD_REQUEST,
      message: "Invalid credentials",
    });

  if (user.scheduledDeletion) {
    if (body.cancelDeletion) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: { scheduledDeletion: null },
        })
        .catch(() => {
          throw new RoxyError({
            code: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to update User",
          });
        });
    } else {
      throw new RoxyError({
        code: StatusCodes.FORBIDDEN,
        message: `Account is scheduled for deletion on ${user.scheduledDeletion}`,
      });
    }
  }

  const jwtAccessToken = fastify.auth.signAccessToken(user.id);
  const jwtRefreshToken = fastify.auth.signRefreshToken(user.id);

  const session = await prisma
    .$transaction(async (tc) => {
      // Delete all sessions with the old Refresh token cookie, if any
      // This is to prevent the user from having multiple sessions from the same browser for example
      // Or multiple sessions from insomnia, etc.
      await tc.session.deleteMany({
        where: {
          userId: user.id,
          hashedRefreshToken: sha256(getRefreshTokenFromRequest(req)),
        },
      });

      const session = await tc.session.create({
        data: {
          user: {
            connect: {
              id: user.id,
            },
          },
          // using sha256 here because we need the output of the hash to always be the same
          // so we can query it
          hashedRefreshToken: sha256(jwtRefreshToken.jwt.token),
          app: getRawUserAgentFromRequest(req),
          estimatedLocation: getEstimatedLocationFromRequest(req),
          ipAddress: getIpFromRequest(req),
        },
      });

      return session;
    })
    .catch((err) => {
      if (err instanceof RoxyError) throw err;
      throw new RoxyError({
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to create Session",
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
