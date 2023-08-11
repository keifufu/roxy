import { RoxyRoute } from "../../plugins/file-routes-plugin";
import { LoginPage } from "../../views/pages/Login/Login";

export const get: RoxyRoute = (req, res) => {
  // TODO: if already authenticated then redirect

  res.jsxte(LoginPage, {});
};
