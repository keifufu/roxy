import Html from "../../components/Html/Html";

export const FilePage: JSXTE.Component<{ file: Roxy.File }> = (props) => (
  <Html title={`Roxy - ${props.file.filename}`}></Html>
);
