import fs from "node:fs";
import path from "node:path";
import { Config } from "./config";

type Loggable = string | number | object;
export class Logger {
  private static log_file = fs.createWriteStream(
    path.join(Config.getEnv("dataPath"), "roxy.log"),
    { flags: "a" }
  );

  private static _log(c: string) {
    Logger.log_file.write("\n" + c);
    console.log(c);
  }

  private static format(c: Loggable, type: "Log" | "Warn" | "Err") {
    return `[${new Date().toISOString()}] [${type}] ${c.toString()}`;
  }

  static log(c: Loggable) {
    this._log(this.format(c, "Log"));
  }

  static warn(c: Loggable) {
    this._log(this.format(c, "Warn"));
  }

  static err(c: Loggable) {
    this._log(this.format(c, "Err"));
  }
}
