import { DioAccount } from "./DioAccount.ts";
export class CompanyAccount extends DioAccount {
  getLoan(amount: number): void {
    this.credit(amount, "loan");
  }
}
