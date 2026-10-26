import { DatabaseSync } from "node:sqlite";
import { PeopleAccount } from "../src/class/PeopleAccount.ts";
import { CompanyAccount } from "../src/class/CompanyAccount.ts";
import { BonusAccount } from "../src/class/BonusAccount.ts";
import type { DioAccount } from "../src/class/DioAccount.ts";

type Kind = "personal" | "business" | "bonus";
type AccountRow = {
  id: number;
  account_number: number;
  name: string;
  kind: Kind;
  active: number;
  created_at: string;
};
type Entry = {
  id: number;
  account_id: number;
  operation: "deposit" | "withdraw" | "loan";
  amount_cents: number;
  credited_cents: number;
  balance_after_cents: number;
  created_at: string;
  reference: string;
  description: string;
};
export class BankStore {
  private db: DatabaseSync;
  constructor(path: string, seed = true) {
    this.db = new DatabaseSync(path);
    this.db
      .exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
      INSERT OR IGNORE INTO schema_version VALUES(1);
      CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY, account_number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 80), kind TEXT NOT NULL CHECK(kind IN ('personal','business','bonus')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), operation TEXT NOT NULL CHECK(operation IN('deposit','withdraw','loan')), amount_cents INTEGER NOT NULL CHECK(amount_cents>0), credited_cents INTEGER NOT NULL, balance_after_cents INTEGER NOT NULL CHECK(balance_after_cents>=0), created_at TEXT NOT NULL, reference TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '');
      CREATE INDEX IF NOT EXISTS movements_account_date ON movements(account_id,id DESC);`);
    if (seed && !this.db.prepare("SELECT id FROM accounts LIMIT 1").get()) {
      this.transaction(() => {
        for (const [name, kind, number] of [
          ["Lia Martins", "personal", 1048],
          ["Estúdio Aurora", "business", 2086],
          ["Lia Martins", "bonus", 3092],
        ] as const)
          this.db
            .prepare(
              "INSERT INTO accounts(account_number,name,kind,created_at) VALUES(?,?,?,?)",
            )
            .run(number, name, kind, new Date().toISOString());
        this.operate(1, "deposit", 2450, "seed-1", "Capital inicial");
        this.operate(1, "withdraw", 180, "seed-2", "Assinaturas e serviços");
        this.operate(1, "deposit", 320, "seed-3", "Projeto freelance");
        this.operate(2, "deposit", 8200, "seed-4", "Recebimento de clientes");
        this.operate(3, "deposit", 750, "seed-5", "Reserva pessoal");
      });
    }
  }
  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private row(id: number): AccountRow {
    const a = this.db.prepare("SELECT * FROM accounts WHERE id=?").get(id) as
      AccountRow | undefined;
    if (!a) throw new Error("Conta não encontrada.");
    return a;
  }
  private entries(id: number): Entry[] {
    return this.db
      .prepare("SELECT * FROM movements WHERE account_id=? ORDER BY id")
      .all(id) as Entry[];
  }
  private hydrate(row: AccountRow): DioAccount {
    const a =
      row.kind === "business"
        ? new CompanyAccount(row.name, row.account_number)
        : row.kind === "bonus"
          ? new BonusAccount(row.name, row.account_number)
          : new PeopleAccount(row.id, row.name, row.account_number);
    for (const m of this.entries(row.id)) {
      if (m.operation === "withdraw") a.withdraw(m.amount_cents / 100);
      else if (m.operation === "loan" && a instanceof CompanyAccount)
        a.getLoan(m.amount_cents / 100);
      else a.deposit(m.amount_cents / 100);
    }
    a.setActive(Boolean(row.active));
    return a;
  }
  list() {
    return (
      this.db
        .prepare("SELECT * FROM accounts ORDER BY id")
        .all() as AccountRow[]
    ).map((row) => ({
      id: row.id,
      accountNumber: row.account_number,
      name: row.name,
      kind: row.kind,
      active: Boolean(row.active),
      createdAt: row.created_at,
      balance: this.hydrate(row).getBalance(),
      movements: this.entries(row.id)
        .reverse()
        .map((m) => ({
          id: m.id,
          type: m.operation,
          cents: m.credited_cents,
          date: m.created_at,
          description: m.description,
          reference: m.reference,
          balanceAfter: m.balance_after_cents / 100,
        })),
    }));
  }
  create(name: unknown, kind: unknown) {
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80 ||
      !["personal", "business", "bonus"].includes(String(kind))
    )
      throw new Error(
        "Informe um nome de 2 a 80 caracteres e uma modalidade válida.",
      );
    return this.transaction(() => {
      if (
        Number(
          (
            this.db.prepare("SELECT COUNT(*) AS n FROM accounts").get() as {
              n: number;
            }
          ).n,
        ) >= 50
      )
        throw new Error("Limite de 50 contas nesta demonstração.");
      const n =
        Number(
          (
            this.db
              .prepare("SELECT MAX(account_number) AS n FROM accounts")
              .get() as { n: number }
          ).n ?? 1000,
        ) + 1;
      const result = this.db
        .prepare(
          "INSERT INTO accounts(account_number,name,kind,created_at) VALUES(?,?,?,?)",
        )
        .run(n, name.trim(), String(kind), new Date().toISOString());
      return Number(result.lastInsertRowid);
    });
  }
  setActive(id: number, active: unknown) {
    this.row(id);
    if (typeof active !== "boolean") throw new Error("Status inválido.");
    this.db
      .prepare("UPDATE accounts SET active=? WHERE id=?")
      .run(active ? 1 : 0, id);
  }
  private operate(
    id: number,
    op: unknown,
    amount: unknown,
    reference: unknown,
    description: unknown = "",
  ) {
    if (
      !["deposit", "withdraw", "loan"].includes(String(op)) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount > 100000000 ||
      typeof reference !== "string" ||
      reference.length < 5 ||
      reference.length > 100 ||
      typeof description !== "string" ||
      description.length > 120
    )
      throw new Error("Dados da operação inválidos.");
    const cents = Math.round(amount * 100);
    if (amount <= 0 || Math.abs(amount * 100 - cents) > 0.000001)
      throw new Error("Informe um valor positivo com até duas casas decimais.");
    const existing = this.db
      .prepare("SELECT * FROM movements WHERE reference=?")
      .get(reference) as Entry | undefined;
    if (existing) {
      if (
        existing.account_id !== id ||
        existing.operation !== op ||
        existing.amount_cents !== cents ||
        existing.description !== description.trim()
      )
        throw new Error("Referência já utilizada por outra operação.");
      return;
    }
    const a = this.hydrate(this.row(id)),
      before = a.getBalance();
    if (op === "deposit") a.deposit(amount);
    else if (op === "withdraw") a.withdraw(amount);
    else if (a instanceof CompanyAccount) a.getLoan(amount);
    else
      throw new Error("Empréstimo disponível apenas para conta empresarial.");
    this.db
      .prepare(
        "INSERT INTO movements(account_id,operation,amount_cents,credited_cents,balance_after_cents,created_at,reference,description) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        String(op),
        cents,
        Math.round((a.getBalance() - before) * 100),
        Math.round(a.getBalance() * 100),
        new Date().toISOString(),
        reference,
        description.trim(),
      );
  }
  move(
    id: number,
    op: unknown,
    amount: unknown,
    reference: unknown,
    description: unknown,
  ) {
    return this.transaction(() =>
      this.operate(id, op, amount, reference, description),
    );
  }
  backup() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: this.list(),
    };
  }
  close() {
    this.db.close();
  }
}
