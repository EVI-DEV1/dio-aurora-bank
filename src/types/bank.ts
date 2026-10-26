export type AccountKind = "personal" | "business" | "bonus";
export type Operation = "deposit" | "withdraw" | "loan";
export interface Movement {
  id: number;
  type: Operation;
  cents: number;
  date: string;
  description: string;
  reference: string;
  balanceAfter: number;
}
export interface Account {
  id: number;
  accountNumber: number;
  name: string;
  kind: AccountKind;
  active: boolean;
  createdAt: string;
  balance: number;
  movements: Movement[];
}
