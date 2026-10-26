import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BankStore } from "../server/store.ts";
test("SQLite mantém saldo, histórico e status após reabrir", () => {
  const dir = mkdtempSync(join(tmpdir(), "aurora-test-"));
  const path = join(dir, "test.sqlite");
  let store = new BankStore(path, false);
  try {
    const id = store.create("Conta persistente", "personal");
    store.move(id, "deposit", 100.25, "test-ref-1", "Recebimento");
    store.move(id, "withdraw", 20, "test-ref-2", "Despesa");
    store.setActive(id, false);
    store.close();
    store = new BankStore(path, false);
    const a = store.list()[0];
    assert.equal(a.balance, 80.25);
    assert.equal(a.movements.length, 2);
    assert.equal(a.movements[1].description, "Recebimento");
    assert.equal(a.active, false);
    assert.throws(
      () => store.move(id, "deposit", 10, "test-ref-3", ""),
      /inativa/,
    );
    assert.equal(store.list()[0].movements.length, 2);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("operações são idempotentes e referências conflitantes não alteram saldo", () => {
  const store = new BankStore(":memory:", false);
  try {
    const id = store.create("Conta bônus", "bonus");
    store.move(id, "deposit", 10, "repeat-test", "Entrada");
    store.move(id, "deposit", 10, "repeat-test", "Entrada");
    assert.equal(store.list()[0].balance, 20);
    assert.equal(store.list()[0].movements.length, 1);
    assert.throws(
      () => store.move(id, "deposit", 20, "repeat-test", "Entrada"),
      /Referência/,
    );
    assert.equal(store.list()[0].balance, 20);
  } finally {
    store.close();
  }
});
test("validações no servidor preservam atomicidade e regras do desafio", () => {
  const store = new BankStore(":memory:", false);
  try {
    const id = store.create("Conta pessoal", "personal");
    store.move(id, "deposit", 100, "atomic-start", "");
    for (const [op, value] of [
      ["withdraw", 100],
      ["withdraw", 101],
      ["loan", 30],
      ["deposit", -1],
      ["deposit", 1.001],
      ["deposit", NaN],
      ["fake", 10],
    ] as const)
      assert.throws(() =>
        store.move(id, op, value, `invalid-${op}-${value}`, ""),
      );
    assert.equal(store.list()[0].balance, 100);
    assert.equal(store.list()[0].movements.length, 1);
    const business = store.create("Estúdio", "business");
    store.move(business, "loan", 250, "loan-ok-1", "Capital de giro");
    assert.equal(store.list()[1].balance, 250);
    assert.throws(() => store.create("x", "personal"));
    assert.throws(() => store.setActive(id, "false"));
  } finally {
    store.close();
  }
});
