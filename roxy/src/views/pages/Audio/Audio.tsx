import Html from "../../components/Html/Html";

export const AudioPage: JSXTE.Component<{ file: Roxy.File }> = (props) => (
  <Html title={`Roxy - ${props.file.filename}`}>
    <audio src="" />
  </Html>
);
