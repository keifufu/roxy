import { URLUtils } from "../../../utils/url-utils";
import FileHeader from "../../components/FileHeader/FileHeader";
import Html from "../../components/Html/Html";

export const VideoPage: JSXTE.Component<{ file: Roxy.File }> = (props) => {
  return (
    <Html
      title={`Video - ${props.file.filename}`}
      Header={FileHeader}
      headerProps={{ title: props.file.filename }}
      og={{
        type: "video.other",
        title: "such title",
        description: "such wow",
        images: [
          {
            url: URLUtils.makeUrl("/stream/video2.thumbnail.png"),
          },
        ],
        videos: [
          {
            url: URLUtils.makeUrl("/stream/video2.mp4"),
            secure_url: URLUtils.makeUrl("/stream/video2.mp4"),
            height: "1920",
            width: "1080",
            type: "video/mp4",
          },
        ],
        twitter: {
          card: "summary_large_image",
          image: URLUtils.makeUrl("/stream/video2.thumbnail.png"),
        },
      }}
    >
      Note that this video player might suck ass, just download the file instead
      <video controls>
        <source type="video/mp4" src={URLUtils.makeUrl("/stream/video2.mp4")} />
      </video>
    </Html>
  );
};
