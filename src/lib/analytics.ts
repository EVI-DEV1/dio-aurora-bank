import type { Movement } from "../types/bank.ts";
export function weeklyFlow(movements: Movement[], now = new Date()) {
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + i,
    );
    return {
      key: dayKey(date),
      label: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      income: 0,
      expense: 0,
    };
  });
  for (const movement of movements) {
    const day = days.find((d) => d.key === dayKey(new Date(movement.date)));
    if (day) {
      if (movement.cents > 0) day.income += movement.cents;
      else day.expense += Math.abs(movement.cents);
    }
  }
  return days;
}
export function statementCsv(movements: Movement[]) {
  const names = { deposit: "Depósito", withdraw: "Saque", loan: "Empréstimo" };
  const cell = (value: string) =>
    '"' +
    (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') +
    '"';
  return (
    "\uFEFFData;Operação;Descrição;Valor em reais;Referência\r\n" +
    movements
      .map((m) =>
        [
          new Date(m.date).toLocaleDateString("pt-BR"),
          names[m.type],
          m.description,
          (m.cents / 100).toFixed(2).replace(".", ","),
          m.reference,
        ]
          .map(cell)
          .join(";"),
      )
      .join("\r\n")
  );
}
