import { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { renderToHtml } from "jsxte";
import { jsx } from "jsxte/jsx-runtime";

declare module "fastify" {
  interface FastifyReply {
    jsxte<T extends object>(
      component: JSXTE.Component<T>,
      props: T
    ): FastifyReply;
  }
}

const jsxtePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateReply("jsxte", function jsxte<
    T extends object
  >(this: FastifyReply, component: JSXTE.Component<T>, props: T) {
    this.type("text/html").send(`
      <!DOCTYPE html>
      ${renderToHtml(jsx(component, props))}
    `);
    return this;
  });
};

export default fp(jsxtePlugin);
