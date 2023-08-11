import { URLUtils } from "../../../utils/url-utils";
import Html from "../../components/Html/Html";

export const ImagePage: JSXTE.Component<{ file: Roxy.File }> = (props) => (
  <Html title={`Roxy - ${props.file.filename}`}>
    <img src={URLUtils.makePath(`/files/image.png`)} />
  </Html>
);
