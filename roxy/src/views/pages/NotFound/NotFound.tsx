import { URLUtils } from "../../../utils/url-utils";
import Html from "../../components/Html/Html";

const cl = (name: string) => `NotFound-${name}`;

const NotFoundPage: JSXTE.Component = () => (
  <Html title="404 Not Found" css={["NotFound"]}>
    <div class={cl("container")}>
      <div class={cl("header")}>404</div>
      <div class={cl("subheader")}>PAGE NOT FOUND</div>
      <p>The page you were looking for does not exist</p>
      <a class={cl("button")} href={URLUtils.makeUrl("/app")}>
        Go Home
      </a>
    </div>
  </Html>
);

export default NotFoundPage;
