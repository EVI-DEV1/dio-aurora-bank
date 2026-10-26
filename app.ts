import { PeopleAccount } from "./src/class/PeopleAccount.ts";
import { CompanyAccount } from "./src/class/CompanyAccount.ts";
import { BonusAccount } from "./src/class/BonusAccount.ts";
const pessoa = new PeopleAccount(123, "Lia — demonstração", 1001);
const empresa = new CompanyAccount("Estúdio Aurora — demonstração", 2001);
const bonus = new BonusAccount("Lia — bônus", 3001);
pessoa.deposit(100);
pessoa.withdraw(25);
empresa.deposit(100);
empresa.getLoan(500);
empresa.withdraw(50);
bonus.deposit(100);
bonus.withdraw(10);
for (const account of [pessoa, empresa, bonus])
  console.log(
    account.getName(),
    account.getAccountNumber(),
    account.getBalance(),
  );
