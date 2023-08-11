import Html from "../../components/Html/Html";

const cl = (name: string) => `RateLimit-${name}`;

const RateLimitPage: JSXTE.Component = () => (
  <Html title="Slow Down" css={["RateLimit"]}>
    <div class={cl("container")}>
      <div class={cl("subheader")}>Slow down</div>
      <p class={cl("message")}>You are being rate limited</p>
    </div>
  </Html>
);

export default RateLimitPage;
