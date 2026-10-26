import { DioAccount } from "./DioAccount.ts";
export class PeopleAccount extends DioAccount {
  private readonly docId: number;
  constructor(docId: number, name: string, accountNumber: number) {
    super(name, accountNumber);
    this.docId = docId;
  }
  getDocId(): number {
    return this.docId;
  }
}
