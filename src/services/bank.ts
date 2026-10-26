import type { Account, AccountKind, Operation } from "../types/bank.ts";
async function request<T>(path: string, body?: unknown): Promise<T> {
  let response;
  try {
    response = await fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Inicie o app com npm run dev.",
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      "O servidor não respondeu corretamente. Verifique se a API está em execução.",
    );
  }
  if (!response.ok)
    throw new Error(value.error || "Não foi possível concluir.");
  return value;
}
export const bank = {
  list: () => request<{ accounts: Account[] }>("/accounts"),
  create: (name: string, kind: AccountKind) =>
    request<{ accounts: Account[]; id: number }>("/accounts", { name, kind }),
  move: (
    id: number,
    operation: Operation,
    amount: number,
    description: string,
    reference: string,
  ) =>
    request<{ accounts: Account[] }>(`/accounts/${id}/movements`, {
      operation,
      amount,
      description,
      reference,
    }),
  status: (id: number, active: boolean) =>
    request<{ accounts: Account[] }>(`/accounts/${id}/status`, { active }),
  backup: () => request<unknown>("/backup"),
};
