import { spawn } from "node:child_process";
const api = spawn(
  process.execPath,
  ["--experimental-strip-types", "server/index.ts"],
  { stdio: "inherit" },
);
const web = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ],
  { stdio: "inherit" },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  web.kill();
  process.exitCode = code;
}
api.on("exit", (code) => stop(code || 0));
web.on("exit", (code) => stop(code || 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
