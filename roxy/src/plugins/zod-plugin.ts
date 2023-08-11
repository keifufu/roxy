import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { RoxyError, RoxyZodErrors } from "..";

declare module "fastify" {
  interface FastifyRequest {
    zod: {
      parseBody<T extends z.AnyZodObject>(zodValidator: T): z.infer<T>;
    };
  }
  interface FastifyReply {
    zod: {
      send<T extends z.AnyZodObject>(
        zodValidator: T,
        json: z.infer<T> & { [key: string]: unknown }
      ): FastifyReply;
    };
  }
}

const formatIssueMessage = (issue: z.ZodIssue): string => {
  switch (issue.code) {
    case "custom":
      return issue.message;
    case "invalid_arguments":
      return "Invalid arguments";
    case "invalid_type":
      return `Expected ${issue.expected}, found ${issue.received}`;
    case "invalid_date":
      return "Invalid date";
    case "invalid_enum_value":
      return `Expected ${issue.options
        .map((option) => `'${option?.toString()}'`)
        .join(" | ")}`;
    case "invalid_intersection_types":
      // Can't see myself using this anyway
      return "Invalid intersection";
    case "invalid_literal":
      return `Expected '${issue.expected}'`;
    case "invalid_return_type":
      return "Invalid return type";
    case "invalid_string":
      switch (issue.validation) {
        case "cuid":
          return "Invalid CUID";
        case "cuid2":
          return "Invalid CUID2";
        case "datetime":
          return "Invalid date/time";
        case "email":
          return "Invalid email";
        case "emoji":
          return "Invalid emoji";
        case "ip":
          return "Invalid ip";
        case "regex":
          return "Failed regex";
        case "ulid":
          return "has to be a ulid";
        case "url":
          return "has to be a url";
        case "uuid":
          return "has to be a uuid";
      }
      return "Invalid";
    case "invalid_union":
      // This one is lacking. Too lazy to properly check this.
      // We get issue.unionErrors here.
      return "Invalid union";
    case "invalid_union_discriminator":
      return `Expected ${issue.options
        .map((option) => `'${option?.toString()}'`)
        .join(" | ")}`;
    case "not_finite":
      return "Invalid finite number";
    case "not_multiple_of":
      return `Not a multiple of ${issue.multipleOf}`;
    case "too_big":
      return `Must contain at most ${issue.maximum} character${
        issue.maximum === 1 ? "" : "s"
      }`;
    case "too_small":
      return `Must contain at least ${issue.minimum} character${
        issue.minimum === 1 ? "" : "s"
      }`;
    case "unrecognized_keys":
      return "Unrecognized keys";
  }
};

const formatZodError = (error: z.ZodError): RoxyZodErrors => {
  const zodErrors: RoxyZodErrors = {};
  error.issues.forEach((issue) => {
    zodErrors[issue.path.join(".")] = formatIssueMessage(issue);
  });
  return zodErrors;
};

const zodPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("zod", {
    getter: function getter(this: FastifyRequest) {
      return {
        parseBody: <T extends z.AnyZodObject>(zodValidator: T) => {
          const parsed = zodValidator.safeParse(this.body);
          if (parsed.success) return parsed.data;
          else
            throw new RoxyError({
              code: StatusCodes.BAD_REQUEST,
              message: "Invalid request body",
              zodErrors: formatZodError(parsed.error),
            });
        },
      };
    },
  });

  fastify.decorateReply("zod", {
    getter: function getter(this: FastifyReply) {
      return {
        send: <T extends z.AnyZodObject>(
          zodValidator: T,
          json: z.infer<T> & { [key: string]: unknown }
        ) => {
          const stripped = zodValidator.parse(json);

          this.type("application/json").send(stripped);
          return this;
        },
      };
    },
  });
};

export default fp(zodPlugin);
