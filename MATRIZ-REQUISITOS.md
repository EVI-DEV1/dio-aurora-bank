# Matriz de requisitos oficiais

Fonte: README de digitalinnovationone/desafio01-ts, consultado em 23/10/2026.

| Requisito | Implementação | Verificação |
|---|---|---|
| Depósito altera saldo | DioAccount.deposit/credit | Teste de saldo e formulário |
| Saque altera saldo | DioAccount.withdraw | Testes de saque válido e limites |
| Status true e saldo maior que saque | validateStatus e comparação estrita | Conta inativa, saldo igual e insuficiente |
| Empréstimo acresce saldo de conta empresarial ativa | CompanyAccount.getLoan | Testes e formulário empresarial |
| Novo tipo sem novos atributos | BonusAccount | Classe apenas sobrescreve deposit |
| Depósito adicional de 10 | BonusAccount.deposit | Dois depósitos válidos e valores inválidos |
| Todos os atributos privados | Campos privados na base e PeopleAccount | Compilação e inspeção do código |
| Nome e número imutáveis | private readonly sem setters | Compilação e inspeção do código |
| Instâncias de todos os tipos em app.ts | PeopleAccount, CompanyAccount e BonusAccount | npm run demo |

Extensões próprias: interface responsiva, extrato, demonstrador de status, validação de valores, centavos inteiros e mensagens acessíveis. Não alteram as regras do enunciado.
