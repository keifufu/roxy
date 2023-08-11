import { URLUtils } from "../../../utils/url-utils";
import FileHeader from "../../components/FileHeader/FileHeader";
import Html from "../../components/Html/Html";

const escapeHTML = (html: string) => {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const PastePage: JSXTE.Component<{ paste: Roxy.Paste }> = (props) => {
  return (
    <Html
      title={`Paste - ${props.paste.title}`}
      head={
        <>
          <link rel="stylesheet" href={URLUtils.makeAsset("highlightjs.css")} />
          <script src={URLUtils.makeAsset("highlightjs.js")} />
          <script src={URLUtils.makeAsset("highlightjs-line-numbers.js")} />
          <script src={URLUtils.makeAsset("highlightjs-theme.js")} />
          <link
            rel="stylesheet"
            href={URLUtils.makeAsset("highlightjs-fix.css")}
          />
        </>
      }
      Header={FileHeader}
      headerProps={{ title: props.paste.title }}
      css={["FileHeader"]}
    >
      <pre>
        <code>{escapeHTML(props.paste.content)}</code>
      </pre>
      <script>hljs.highlightAll();</script>
      <script>hljs.initLineNumbersOnLoad();</script>
    </Html>
  );
};
