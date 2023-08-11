import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type ConfigType = {
  _: string;
  url: string;
  port: number;
  useHttps: boolean;
  sslCertPath: string | null;
  sslKeyPath: string | null;
  isProxied: boolean;
  allowRegistrations: boolean;
  defaultLimitsTotalMb: number;
  defaultLimitsCustomUrls: number;
  urlShortenerKeyLength: number;
  pasteKeyLength: number;
  fileKeyLength: number;
  globalRateLimitPerSecond: number;
};
type Secrets = {
  cookie: string;
  accessJwtSecret: string;
  accessJwtExpirationSeconds: number;
  refreshJwtSecret: string;
  refreshJwtExpirationSeconds: number;
};
type Env = { dataPath: string; terminationToken: string };

export class Config {
  private static isInitialized = false;
  private static config: ConfigType;
  private static secrets: Secrets;
  private static env: Env;

  private static initialize() {
    this.isInitialized = true;
    this.env = this.readEnv();
    this.config = this.readConfig();
    this.secrets = this.readSecrets();
  }

  private static readEnv = () => {
    const envPath = ".env";
    const env: Env = { dataPath: "", terminationToken: "" };
    fs.readFileSync(envPath, "utf-8")
      .replace(/\r/g, "")
      .split("\n")
      .forEach((line) => {
        if (line.startsWith("DATA_PATH=")) env.dataPath = line.split("=")[1];
        else if (line.startsWith("TERMINATION_TOKEN="))
          env.terminationToken = line.split("=")[1];
      });
    return env;
  };

  private static readConfig = () => {
    const defaultConfig: ConfigType = {
      _: "Read more on the Wiki: https://github.com/keifufu/roxy/wiki",
      url: "https://dev.keifufu.dev",
      port: 7227,
      useHttps: false,
      sslCertPath: null,
      sslKeyPath: null,
      isProxied: true,
      allowRegistrations: true,
      defaultLimitsTotalMb: 50,
      defaultLimitsCustomUrls: 0,
      urlShortenerKeyLength: 5,
      pasteKeyLength: 5,
      fileKeyLength: 5,
      globalRateLimitPerSecond: 1000,
    };

    const configPath = path.join(this.getEnv("dataPath"), "roxy.json");

    if (!fs.existsSync(configPath))
      fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, null, 2),
        "utf-8"
      );

    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  };

  private static readSecrets = () => {
    const defaultSecrets: Secrets = {
      cookie: crypto.randomBytes(64).toString("hex"),
      accessJwtSecret: crypto.randomBytes(64).toString("hex"),
      accessJwtExpirationSeconds: 900, // 15 Minutes
      refreshJwtSecret: crypto.randomBytes(64).toString("hex"),
      refreshJwtExpirationSeconds: 2419200, // 30 days
    };

    const secretsPath = path.join(this.getEnv("dataPath"), "secrets.json");

    if (!fs.existsSync(secretsPath))
      fs.writeFileSync(
        secretsPath,
        JSON.stringify(defaultSecrets, null, 2),
        "utf-8"
      );

    return JSON.parse(fs.readFileSync(secretsPath, "utf-8"));
  };

  static get<T extends keyof ConfigType>(k: T) {
    if (!this.isInitialized) this.initialize();
    return this.config[k];
  }

  static getSecret<T extends keyof Secrets>(k: T) {
    if (!this.isInitialized) this.initialize();
    return this.secrets[k];
  }

  static getEnv<T extends keyof Env>(k: T) {
    if (!this.isInitialized) this.initialize();
    return this.env[k];
  }
}
