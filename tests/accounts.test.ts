import { test } from "node:test";
import assert from "node:assert/strict";
import { PeopleAccount } from "../src/class/PeopleAccount.ts";
import { CompanyAccount } from "../src/class/CompanyAccount.ts";
import { BonusAccount } from "../src/class/BonusAccount.ts";
test("depósito e saque alteram saldo sem erro decimal", () => {
  const a = new PeopleAccount(1, "Teste", 1);
  a.deposit(0.1);
  a.deposit(0.2);
  a.withdraw(0.1);
  assert.equal(a.getBalance(), 0.2);
});
test("saque igual ou superior ao saldo é recusado sem mutação", () => {
  const a = new PeopleAccount(1, "Teste", 1);
  a.deposit(100);
  for (const value of [100, 101]) assert.throws(() => a.withdraw(value));
  assert.equal(a.getBalance(), 100);
  assert.equal(a.getMovements().length, 1);
});
test("contas inativas bloqueiam todas as operações", () => {
  const a = new CompanyAccount("Teste", 1);
  a.deposit(100);
  a.setActive(false);
  for (const action of [
    () => a.deposit(1),
    () => a.withdraw(1),
    () => a.getLoan(1),
  ])
    assert.throws(action);
  assert.equal(a.getBalance(), 100);
});
test("empréstimo empresarial acrescenta saldo", () => {
  const a = new CompanyAccount("Teste", 1);
  a.getLoan(250.5);
  assert.equal(a.getBalance(), 250.5);
  assert.equal(a.getMovements()[0].type, "loan");
});
test("bônus acrescenta dez reais a cada depósito válido", () => {
  const a = new BonusAccount("Teste", 1);
  a.deposit(100);
  a.deposit(1);
  assert.equal(a.getBalance(), 121);
});
test("valores inválidos não recebem bônus e não alteram extrato", () => {
  const a = new BonusAccount("Teste", 1);
  for (const v of [0, -1, NaN, Infinity, 0.001, 1.123])
    assert.throws(() => a.deposit(v));
  assert.equal(a.getBalance(), 0);
  assert.deepEqual(a.getMovements(), []);
});
test("extrato é cópia, sem acesso mutável ao estado interno", () => {
  const a = new CompanyAccount("Teste", 1);
  a.deposit(10);
  const list = a.getMovements();
  Object.assign(list[0], { cents: 0 });
  list.length = 0;
  assert.equal(a.getMovements()[0].cents, 1000);
});
