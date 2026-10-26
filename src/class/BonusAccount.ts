import { DioAccount } from "./DioAccount.ts";
export class BonusAccount extends DioAccount {
  override deposit(amount: number): void {
    this.credit(amount, "deposit", 1000);
  }
}
