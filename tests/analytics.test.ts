import test from "node:test";
import assert from "node:assert/strict";
import { weeklyFlow, statementCsv } from "../src/lib/analytics.ts";
import type { Movement } from "../src/types/bank.ts";
const movement = (date: string, cents: number, description = ""): Movement => ({
  id: 1,
  type: cents > 0 ? "deposit" : "withdraw",
  cents,
  date,
  description,
  reference: "ref-test",
  balanceAfter: 100,
});
test("fluxo semanal inclui limites e ano anterior sem misturar dias fora do período", () => {
  const now = new Date(2026, 0, 3, 12);
  const flow = weeklyFlow(
    [
      movement(new Date(2025, 11, 28, 12).toISOString(), 10000),
      movement(new Date(2026, 0, 3, 12).toISOString(), -2500),
      movement(new Date(2025, 11, 27, 12).toISOString(), 99999),
      movement(new Date(2026, 0, 4, 12).toISOString(), 500),
    ],
    now,
  );
  assert.equal(flow.length, 7);
  assert.equal(flow[0].income, 10000);
  assert.equal(flow[6].expense, 2500);
  assert.equal(
    flow.reduce((n, d) => n + d.income, 0),
    10000,
  );
});
test("fluxo sem dados produz sete dias vazios", () => {
  assert.ok(
    weeklyFlow([], new Date(2026, 9, 26)).every(
      (d) => d.income === 0 && d.expense === 0,
    ),
  );
});
test("CSV preserva descrições e neutraliza fórmulas e aspas", () => {
  const csv = statementCsv([
    movement("2026-10-26T12:00:00Z", 10000, '=HYPERLINK("example")'),
    movement("2026-10-26T12:00:00Z", -2500, 'Cliente; "Horizonte"'),
  ]);
  assert.ok(csv.startsWith("\uFEFFData;"));
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
  assert.ok(csv.includes('"Cliente; ""Horizonte"""'));
  assert.ok(csv.includes("100,00"));
  assert.ok(csv.includes("-25,00"));
});
