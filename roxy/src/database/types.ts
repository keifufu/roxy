import prisma from "@prisma/client";
import { z } from "zod";
import * as prismaZod from "./@generated";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Roxy {
    type User = prisma.User & {
      usage: prisma.UserUsage;
      limits: prisma.UserLimits;
    };
    type Session = prisma.Session;
    type Paste = prisma.Paste & { uniqueKey: prisma.UniqueKey };
    type File = prisma.File & { uniqueKey: prisma.UniqueKey };
  }
}

export const DTO = {
  username: z.string().min(3).max(24),
  password: z.string().max(4096),
  JWT: z.object({
    token: z.string(),
    expires: z.number(),
  }),
  User: prismaZod.UserZodModel.omit({
    hashedPassword: true,
    limitsId: true,
    mfaBackupCodes: true,
    mfaSecret: true,
    usageId: true,
  }).extend({
    usage: prismaZod.UserUsageZodModel,
    limits: prismaZod.UserLimitsZodModel,
  }),
  Session: prismaZod.SessionZodModel.omit({
    userId: true,
    hashedRefreshToken: true,
  }),
};
