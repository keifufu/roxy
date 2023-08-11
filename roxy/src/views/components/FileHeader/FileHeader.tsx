import { URLUtils } from "../../../utils/url-utils";

export type FileHeaderProps = {
  title: string;
};

const cl = (name: string) => `FileHeader-${name}`;

const FileHeader: JSXTE.Component<FileHeaderProps> = (props) => {
  return (
    <div class={cl("base")}>
      {props.title}
      <a href={URLUtils.makeUrl("idk yet?")}>Download</a>
    </div>
  );
};

export default FileHeader;
