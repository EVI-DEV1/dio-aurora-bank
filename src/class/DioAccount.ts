export type Movement = Readonly<{
  id: number;
  type: "deposit" | "withdraw" | "loan";
  cents: number;
  date: string;
}>;
export abstract class DioAccount {
  private readonly name: string;
  private readonly accountNumber: number;
  private balance = 0;
  private status = true;
  private movements: Movement[] = [];
  constructor(name: string, accountNumber: number) {
    if (
      !name.trim() ||
      !Number.isSafeInteger(accountNumber) ||
      accountNumber <= 0
    )
      throw new Error("Identificação de conta inválida.");
    this.name = name.trim();
    this.accountNumber = accountNumber;
  }
  getName(): string {
    return this.name;
  }
  getAccountNumber(): number {
    return this.accountNumber;
  }
  getBalance(): number {
    return this.balance / 100;
  }
  isActive(): boolean {
    return this.status;
  }
  setActive(active: boolean): void {
    this.status = active;
  }
  getMovements(): Movement[] {
    return this.movements.map((item) => ({ ...item }));
  }
  deposit(amount: number): void {
    this.credit(amount, "deposit");
  }
  withdraw(amount: number): void {
    this.validateStatus();
    const cents = this.toCents(amount);
    if (this.balance <= cents)
      throw new Error("O saldo deve ser maior que o valor do saque.");
    this.balance -= cents;
    this.record("withdraw", -cents);
  }
  protected credit(amount: number, type: "deposit" | "loan", bonus = 0): void {
    this.validateStatus();
    const cents = this.toCents(amount) + bonus;
    if (!Number.isSafeInteger(this.balance + cents))
      throw new Error("Valor acima do limite do simulador.");
    this.balance += cents;
    this.record(type, cents);
  }
  private validateStatus(): void {
    if (!this.status)
      throw new Error("Conta inativa. Reative para movimentar.");
  }
  private toCents(amount: number): number {
    const cents = Math.round(amount * 100);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(cents) ||
      cents <= 0 ||
      Math.abs(amount * 100 - cents) > 0.000001
    )
      throw new Error("Informe um valor positivo com até duas casas decimais.");
    return cents;
  }
  private record(type: Movement["type"], cents: number): void {
    this.movements.unshift({
      id: this.movements.length + 1,
      type,
      cents,
      date: new Date().toISOString(),
    });
  }
}
