// Builds with the real Cloudflare D1 database and deploys to Cloudflare Workers.
// One-time setup: `npx wrangler login`, `npx wrangler d1 create krust-db`,
// then paste the printed database_id into deploy.config.json.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../deploy.config.json", import.meta.url), "utf8"));
if (!/^[0-9a-f-]{36}$/.test(config.d1DatabaseId ?? "") || config.d1DatabaseId.startsWith("00000000")) {
  console.error("\n  Set d1DatabaseId in deploy.config.json first (from `npx wrangler d1 create krust-db`).\n");
  process.exit(1);
}

const env = { ...process.env, D1_DATABASE_ID: config.d1DatabaseId, D1_DATABASE_NAME: config.d1DatabaseName, WORKER_NAME: config.workerName };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });
run("npm run build");
run("npx wrangler deploy --config dist/server/wrangler.json");
