/* eslint-disable @typescript-eslint/no-var-requires */

// This creates a default .env if none exists
// Also creates a .env for prisma because it's dumb and cant concatenate environment variables

const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

const defaultDataPath = () => {
  const platform = os.platform();
  if (platform === "win32") return path.join(process.env.LOCALAPPDATA, "roxy");
  else return path.join(os.homedir(), "roxy");
};

const defaultEnv = `
DATA_PATH=${defaultDataPath()}
TERMINATION_TOKEN=
`;

if (!fs.existsSync(".env")) fs.writeFileSync(".env", defaultEnv, "utf-8");

fs.readFileSync(".env", "utf-8")
  .replace(/\r/g, "")
  .split("\n")
  .forEach((line) => {
    if (line.startsWith("DATA_PATH=")) {
      const path = line.split("=")[1];
      require("fs").writeFileSync(
        "./prisma/.env",
        `PRISMA_DB_PATH=file:${path}\\roxy.db`
      );
    }
  });
