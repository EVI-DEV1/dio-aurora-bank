import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("API persiste, recusa origem externa e mantém operação única após repetição", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aurora-http-"));
  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", "server/index.ts"],
    {
      env: { ...process.env, PORT: "3197", AURORA_DATA_DIR: directory },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("Aurora:")) resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) =>
        reject(new Error("Servidor encerrou: " + code)),
      );
      setTimeout(() => reject(new Error("API não iniciou")), 8000).unref();
    });
    const base = "http://127.0.0.1:3197";
    const post = (path, body, extra = {}) =>
      fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extra },
        body: JSON.stringify(body),
      });
    let response = await post("/api/accounts", {
      name: "HTTP Demo",
      kind: "business",
    });
    assert.equal(response.status, 201);
    const { id } = await response.json();
    const operation = {
      operation: "loan",
      amount: 123.45,
      reference: "http-operation-1",
      description: "Teste de contrato",
    };
    assert.equal(
      (await post(`/api/accounts/${id}/movements`, operation)).status,
      200,
    );
    assert.equal(
      (await post(`/api/accounts/${id}/movements`, operation)).status,
      200,
    );
    const { accounts } = await (await fetch(base + "/api/accounts")).json();
    const account = accounts.find((a) => a.id === id);
    assert.equal(account.balance, 123.45);
    assert.equal(account.movements.length, 1);
    assert.equal(
      (
        await post(`/api/accounts/${id}/movements`, {
          ...operation,
          amount: -1,
          reference: "http-bad-1",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(
          "/api/accounts",
          { name: "Externamente", kind: "personal" },
          { Origin: "https://external.example" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{bad",
        })
      ).status,
      400,
    );
    assert.equal((await fetch(base + "/api/backup")).status, 200);
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
    rmSync(directory, { recursive: true, force: true });
  }
});
