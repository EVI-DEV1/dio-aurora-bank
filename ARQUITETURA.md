# Arquitetura — Aurora Workspace

## Fluxo

Interface → serviço tipado → API HTTP local → repositório SQLite → classes de domínio → gravação transacional → resposta atualizada.

O navegador não altera saldos diretamente. Valor, modalidade, status e limite do saque são conferidos no servidor. O domínio do desafio continua executável isoladamente em app.ts.

## Modelo de dados v1

- `schema_version`: versão do esquema atual (1). Mudanças futuras precisam de migrações explícitas; não recriar um banco existente.
- `accounts`: id, account_number único, name, kind (`personal`, `business`, `bonus`), active e created_at.
- `movements`: id, account_id com chave estrangeira, operation, amount_cents (valor solicitado), credited_cents (efeito incluindo bônus ou débito), balance_after_cents, created_at, reference única e description.
- Índice por account_id/id facilita leitura do histórico por conta. Exclusão e edição retroativa de movimentos não são oferecidas.

Centavos inteiros evitam acumulação decimal. Datas são geradas no servidor e exibidas no fuso do navegador. As referências identificam operações; repetir a mesma referência e os mesmos dados não grava duas vezes. Reutilizar a referência com outro conteúdo é recusado.

Cada operação abre `BEGIN IMMEDIATE`, recupera a conta e reaplica as operações históricas com as classes de domínio. Só depois grava o efeito e o saldo resultante. Qualquer erro produz rollback. WAL, foreign_keys e busy_timeout estão habilitados. O status atual é aplicado após reconstruir o histórico para preservar operações feitas quando a conta estava ativa.

A reconstrução tem custo proporcional ao histórico. É apropriada para uma demonstração pequena; grande volume exige snapshots validados, paginação do extrato e testes de carga antes de expansão.

## API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | /api/health | Saúde e modo do armazenamento |
| GET | /api/accounts | Contas e movimentos |
| POST | /api/accounts | Cadastro: name e kind |
| POST | /api/accounts/:id/movements | operation, amount, reference e description |
| POST | /api/accounts/:id/status | active booleano |
| GET | /api/backup | Exportação legível de dados em JSON |

Corpos JSON limitados a 8KB. Requisições de origem externa são recusadas; Host é restrito a localhost/127.0.0.1. SQL usa parâmetros. CSV neutraliza fórmulas e escapa campos. A interface impede envio simultâneo e conserva a referência de uma tentativa com resposta incerta para permitir repetição segura.

## Escopo comercial desta versão

Pronta para demonstração local de jornadas, apresentação de portfólio e evolução como base de interface. Não é um serviço bancário de produção nem um sistema público multiusuário. Saldo e crédito são simulações; não há juros, cobrança, liquidação, conciliação ou integração financeira.

Antes de uma versão hospedada: definir público e modelo de negócio; autenticar usuários; autorizar cada conta; isolar dados por workspace; configurar TLS e gestão de segredos; limitar requisições; monitorar erros; instituir backups com restauração testada; migrar esquema por versão e executar revisão de segurança. Integração com serviços financeiros exige projeto e requisitos próprios.

## Roteiro de apresentação

1. Abrir a conta Essencial e consultar o saldo e histórico persistido.
2. Criar uma conta Negócios com nome de uma empresa fictícia.
3. Registrar depósito com descrição e consultar pela busca.
4. Recarregar a página e mostrar que conta e operação continuam salvas.
5. Demonstrar crédito empresarial, restrição do saque e bônus da conta Mais.
6. Exportar extrato filtrado e dados do workspace.

Nunca inserir dados pessoais reais em demonstrações públicas desta versão.
