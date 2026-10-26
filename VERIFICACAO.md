# Verificação

Versão revisada em 26/10/2026, com Node.js24 e Windows.

## Automação

- 14 testes aprovados: domínio monetário, centavos, saldo igual/insuficiente, contas inativas, empréstimo, bônus, cópia do extrato, idempotência, persistência após reabrir SQLite, HTTP, fluxo semanal e CSV.
- Build TypeScript/Vite aprovado, incluindo verificação de tipos do servidor e da interface.
- app.ts executado: saldos finais 75, 550 e 100 nos três tipos de conta.
- Dependências de produção: npm audit --omit=dev sem vulnerabilidades reportadas.

## Verificação pela interface

Utilizado banco isolado, sem alterar os dados do workspace principal.

| Fluxo | Resultado |
| --- | --- |
| Cadastro empresarial | Conta criada com saldo inicial zero |
| Depósito de R$100,25 | Saldo e histórico atualizados |
| Saque de R$100,25 | Recusado por ser igual ao saldo |
| Saque de R$20,25 pelo teclado | Saldo final R$80 |
| Empréstimo de R$250 | Saldo final R$330 |
| Desativar/reativar | Confirmação bloqueada enquanto inativa |
| Recarregar e selecionar conta | Saldo, status e histórico preservados |
| Conta Mais, depósito de R$50 | Crédito de R$60; saldo de R$760 para R$820 |
| Buscar por descrição e filtrar saque | Resultados correspondentes ao filtro |
| Busca sem correspondência | Estado vazio exibido |
| CSV do resultado filtrado | Descrição e R$100,25 presentes; empréstimo excluído |
| JSON do workspace | Quatro contas e conta de validação presentes |
| Ocultar valores | Saldo oculto e barras do gráfico zeradas |
| Tema claro e recarga | Preferência preservada |
| Telas de 320, 390 e 768px | Documento não excedeu a viewport |

Foram inspecionados os layouts e os arquivos de marca. As referências SVG são ilustrações estáticas; não equivalem a screenshots do HTML.

## Limites

Essas verificações não constituem auditoria formal de acessibilidade ou segurança. Não foram feitos teste de carga, teste com leitor de tela ou homologação para operações financeiras reais. A aplicação usa dados fictícios, execução local e não possui autenticação multiusuário.

## Reprodução a partir do GitHub

Uma cópia nova do repositório foi instalada com npm ci: os 14 testes e o build passaram. O repositório define quebras de linha em .gitattributes para que o Git no Windows não converta os arquivos de código para CRLF e provoque divergência de formatação.
