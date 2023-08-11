import { URLUtils } from "../../../utils/url-utils";
import Html from "../../components/Html/Html";

export const LoginPage: JSXTE.Component = () => (
  <Html title="Roxy - Login" js={["Login"]}>
    <form action={URLUtils.makeUrl("/api/auth/login")}></form>
  </Html>
);
