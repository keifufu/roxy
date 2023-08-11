import Html from "../../components/Html/Html";

const cl = (name: string) => `Error-${name}`;

const ErrorPage: JSXTE.Component<{ message: string; code: number }> = (
  props
) => (
  <Html title={props.code} css={["Error"]}>
    <div class={cl("container")}>
      <div class={cl("header")}>{props.code}</div>
      <div class={cl("subheader")}>An error occurred</div>
      <p>{props.message}</p>
    </div>
  </Html>
);

export default ErrorPage;
