import { createServer } from "node:http";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { BankStore } from "./store.ts";
const data = resolve(process.env.AURORA_DATA_DIR || "data");
mkdirSync(data, { recursive: true });
const store = new BankStore(resolve(data, "aurora.sqlite"));
const port = Number(process.env.PORT || 3001),
  host = "127.0.0.1";
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  const json = (status: number, value: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    if (
      !req.headers.host ||
      !["127.0.0.1", "localhost"].includes(req.headers.host.split(":")[0])
    )
      return json(403, { error: "Host não permitido." });
    if (
      req.headers.origin &&
      !new Set([
        `http://127.0.0.1:${port}`,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        `http://localhost:${port}`,
      ]).has(req.headers.origin)
    )
      return json(403, { error: "Origem não permitida." });
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "GET" && url.pathname === "/api/accounts")
        return json(200, { accounts: store.list() });
      if (req.method === "GET" && url.pathname === "/api/backup")
        return json(200, store.backup());
      if (req.method === "GET" && url.pathname === "/api/health")
        return json(200, {
          status: "ok",
          storage: "sqlite",
          mode: "local-demo",
        });
      if (req.method !== "POST")
        return json(404, { error: "Rota não encontrada." });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return json(415, { error: "Envie JSON." });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 8192)
          return json(413, { error: "Requisição muito grande." });
      }
      let b;
      try {
        b = JSON.parse(raw);
      } catch {
        return json(400, { error: "JSON inválido." });
      }
      if (!b || typeof b !== "object" || Array.isArray(b))
        return json(400, { error: "Objeto inválido." });
      if (url.pathname === "/api/accounts") {
        const id = store.create(b.name, b.kind);
        return json(201, { id, accounts: store.list() });
      }
      const match = url.pathname.match(
        /^\/api\/accounts\/(\d+)\/(movements|status)$/,
      );
      if (!match) return json(404, { error: "Rota não encontrada." });
      const id = Number(match[1]);
      if (match[2] === "status") store.setActive(id, b.active);
      else
        store.move(id, b.operation, b.amount, b.reference, b.description || "");
      return json(200, { accounts: store.list() });
    }
    if (req.method !== "GET")
      return json(405, { error: "Método não permitido." });
    const root = resolve("dist"),
      candidate = resolve(root, "." + decodeURIComponent(url.pathname));
    if (candidate !== root && !candidate.startsWith(root + sep))
      return json(403, { error: "Caminho inválido." });
    const file =
      existsSync(candidate) && extname(candidate)
        ? candidate
        : resolve(root, "index.html");
    if (!existsSync(file))
      return json(503, {
        error:
          "Execute npm run build ou utilize o servidor de desenvolvimento.",
      });
    const mime: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(readFileSync(file));
  } catch (error) {
    json(400, {
      error:
        error instanceof Error ? error.message : "Não foi possível concluir.",
    });
  }
});
server.listen(port, host, () =>
  console.log(`Aurora: http://${host}:${port} · SQLite persistente em data/`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
