import { ContextMap } from "jsxte";
import { URLUtils } from "../../../utils/url-utils";
import Footer from "../Footer/Footer";

type OpenGraphImage = {
  url: string;
  secure_url?: string;
  type?: string;
  alt?: string;
  width?: string;
  height?: string;
};

type OpenGraphVideo = {
  url: string;
  secure_url?: string;
  type?: string;
  width?: string;
  height?: string;
};

type OpenGraphAudio = {
  url: string;
  secure_url?: string;
  type?: string;
};

type OpenGraphTwitter = {
  card?: "summary_large_image";
  domain?: string;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
};

type OpenGraphProps = {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  site_name?: string;
  images?: OpenGraphImage[];
  videos?: OpenGraphVideo[];
  audios?: OpenGraphAudio[];
  twitter?: OpenGraphTwitter;
};

type HtmlProps<T extends object> = {
  title: string | number;
  head?: JSXTE.ElementChildren;
  Header?: JSXTE.Component<T>;
  headerProps?: T;
  css?: string[];
  js?: string[];
  og?: OpenGraphProps;
};
type HtmlComponent = <T extends object>(
  props: JSXTE.PropsWithChildren<HtmlProps<T>>,
  contextMap: ContextMap
) => JSX.Element;

const cl = (name: string) => `Html-${name}`;

const Html: HtmlComponent = (props) => (
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link
        rel="icon"
        type="image/x-icon"
        href={URLUtils.makeUrl("/assets/favicon.ico")}
      />
      <link rel="stylesheet" href={URLUtils.makeAsset(`/css/Html`)} />
      <link rel="stylesheet" href={URLUtils.makeAsset(`/css/Footer`)} />
      {props.css &&
        props.css.map((css) => (
          <link rel="stylesheet" href={URLUtils.makeAsset(`/css/${css}`)} />
        ))}
      {props.js &&
        props.js.map((js) => <script src={URLUtils.makeAsset(`/js/${js}`)} />)}
      <script src={URLUtils.makeAsset("theme.js")} />
      <title>{props.title}</title>
      {generateOpenGraphTags(props.og)}
      {props.head}
    </head>
    <body>
      <div class={cl("wrapper")}>
        {props.Header && props.headerProps && (
          <props.Header {...props.headerProps} />
        )}
        <div class={cl("content")}>{props.children}</div>
        <Footer />
      </div>
    </body>
  </html>
);

export default Html;

function generateOpenGraphTags(og?: OpenGraphProps) {
  if (!og) return null;
  const tags: JSX.Element[] = [];

  Object.entries(og).map(([key, value]) => {
    if (key === "images") {
      (value as OpenGraphImage[]).map((image) => {
        Object.entries(image).map(([key, value]) => {
          tags.push(
            <meta
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              property={`og:image:${key}`.replace(":url", "") as never}
              content={value as string}
            />
          );
        });
      });
    } else if (key === "videos") {
      (value as OpenGraphVideo[]).map((image) => {
        Object.entries(image).map(([key, value]) => {
          tags.push(
            <meta
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              property={`og:video:${key}`.replace(":url", "") as never}
              content={value as string}
            />
          );
        });
      });
    } else if (key === "audios") {
      (value as OpenGraphAudio[]).map((image) => {
        Object.entries(image).map(([key, value]) => {
          tags.push(
            <meta
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              property={`og:audio:${key}`.replace(":url", "") as never}
              content={value as string}
            />
          );
        });
      });
    } else if (key === "twitter") {
      Object.entries(value as OpenGraphTwitter).map(([key, value]) => {
        tags.push(
          <meta
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            property={`twitter:${key}` as never}
            content={value as string}
          />
        );
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tags.push(<meta property={`og:${key}`} content={value as string} />);
    }
  });

  return tags;
}
