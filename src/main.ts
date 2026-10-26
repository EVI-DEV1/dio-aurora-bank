import "./style.css";
import "./styles/product.css";
import "./styles/themes.css";
import "./styles/release.css";
import { weeklyFlow, statementCsv } from "./lib/analytics.ts";
import { currentTheme, setTheme } from "./ui/theme.ts";
import { bank } from "./services/bank.ts";
import type { Account, AccountKind, Operation } from "./types/bank.ts";
setTheme(currentTheme());
let accounts: Account[] = [];
let current = 0,
  operation: Operation = "deposit",
  notice = "",
  failed = false,
  hidden = false,
  expanded = false;
let query = "",
  filter = "all",
  pending = false,
  creating = false;
let amountDraft = "",
  descriptionDraft = "";
let intent: { fingerprint: string; reference: string } | undefined;
const kindLabel: Record<AccountKind, string> = {
  personal: "Essencial",
  business: "Negócios",
  bonus: "Mais",
};
const kindDescription: Record<AccountKind, string> = {
  personal: "Pessoa física",
  business: "Conta empresarial",
  bonus: "Conta com bônus",
};
const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const names = { deposit: "Depósito", withdraw: "Saque", loan: "Empréstimo" };
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  swap: "M4 7h15m-4-4 4 4-4 4 M20 17H5m4-4-4 4 4 4",
  list: "M8 6h12 M8 12h12 M8 18h12 M3 6h.01 M3 12h.01 M3 18h.01",
  arrow: "M6 18 18 6 M6 6h12v12",
  down: "M18 6 6 18 M6 6v12h12",
  plus: "M12 5v14 M5 12h14",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  info: "M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  chevron: "m8 10 4 4 4-4",
  check: "m5 12 4 4L19 6",
  spark: "m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z",
  card: "M3 5h18v14H3z M3 10h18 M7 15h3",
  shield: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z M8 12l3 3 5-6",
  bell: "M6 9a6 6 0 0 1 12 0v7l2 2H4l2-2z M10 21h4",
  moon: "M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z",
  sun: "M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  close: "m6 6 12 12 M6 18 18 6",
};
const icon = (name: string, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.arrow}"/></svg>`;
function syncNavigation() {
  const section = location.hash || "#overview";
  document
    .querySelectorAll<HTMLAnchorElement>(".sidebar nav a,.mobile-nav a")
    .forEach((link) => {
      const active = link.hash === section;
      link.classList.toggle(
        link.closest(".mobile-nav") ? "active" : "nav-active",
        active,
      );
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
}
window.addEventListener("hashchange", syncNavigation);
function render() {
  const a = accounts[current],
    allHistory = a.movements,
    business = a.kind === "business";
  const history = allHistory.filter(
    (m) =>
      (filter === "all" || m.type === filter) &&
      (!query ||
        `${names[m.type]} ${m.description} ${m.reference}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR"))),
  );
  const income =
    allHistory.filter((m) => m.cents > 0).reduce((sum, m) => sum + m.cents, 0) /
    100;
  const spent =
    Math.abs(
      allHistory
        .filter((m) => m.cents < 0)
        .reduce((sum, m) => sum + m.cents, 0),
    ) / 100;
  const flow = weeklyFlow(allHistory);
  const peak = Math.max(1, ...flow.flatMap((day) => [day.income, day.expense]));
  const periodIncome = flow.reduce((sum, d) => sum + d.income, 0) / 100;
  const periodExpense = flow.reduce((sum, d) => sum + d.expense, 0) / 100;
  const amountText = (n: number) => (hidden ? "R$ •••••" : money(n));
  const accountLabels = accounts.map((a) => kindLabel[a.kind]);
  const description = accounts.map((a) => kindDescription[a.kind]);
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<aside class="sidebar"><a class="brand" href="#overview" aria-label="Aurora Bank início"><img class="brand-wordmark brand-for-dark" src="/brand/aurora-logo-dark.svg?v=2" alt="Aurora Bank"><img class="brand-wordmark brand-for-light" src="/brand/aurora-logo-light.svg?v=2" alt="Aurora Bank"></a><div class="nav-caption">PRINCIPAL</div><nav aria-label="Navegação principal"><a class="nav-active" href="#overview">${icon("grid")}<span>Visão geral</span><span class="nav-indicator"></span></a><a href="#movement">${icon("swap")}<span>Movimentar</span></a><a href="#statement">${icon("list")}<span>Extrato</span></a><a href="#about">${icon("info")}<span>Sobre o app</span></a></nav><div class="sidebar-note"><span class="sidebar-version">AURORA WORKSPACE</span><p>Gestão de contas<br>e movimentações</p></div><div class="sidebar-bottom"><span class="demo-label"><i></i> DADOS FICTÍCIOS</span><div class="profile"><span class="avatar">LM</span><div><strong>Lia Martins</strong><small>Workspace pessoal</small></div></div></div></aside>
<main id="overview"><header class="topbar"><div class="breadcrumb"><img class="mobile-brand-symbol" src="/brand/aurora-symbol.svg?v=2" alt="Aurora Bank">Workspace <span>/</span> <strong>Contas</strong></div><div class="topbar-right"><div class="theme-switch" role="group" aria-label="Tema da interface"><button type="button" data-theme-choice="dark" aria-label="Tema escuro" aria-pressed="${currentTheme() === "dark"}">${icon("moon")}<span>Escuro</span></button><button type="button" data-theme-choice="light" aria-label="Tema claro" aria-pressed="${currentTheme() === "light"}">${icon("sun")}<span>Claro</span></button></div><span class="local-badge"><i></i> Demonstração</span><span class="avatar avatar-small" aria-label="Perfil demonstrativo de Lia Martins">LM</span></div></header>
<section class="page-heading"><div><span class="eyebrow">CONTAS E OPERAÇÕES</span><h1>Visão geral</h1><p>Suas contas, em um só lugar.</p></div><div class="heading-context">${icon("shield")}<span>Histórico atualizado<strong>Salvo neste dispositivo</strong></span></div></section>
<div class="workspace-actions"><span class="workspace-label"><i></i> Workspace local <span> / </span> ${accounts.length} contas</span><div><button class="text-button" id="backup-data">${icon("download")}Exportar dados</button><button class="primary-small" id="create-account">${icon("plus")}Nova conta</button></div></div><div class="account-bar"><div class="account-tabs" role="group" aria-label="Escolha uma conta">${accountLabels.map((label, i) => `<button class="account-tab ${i === current ? "active" : ""}" data-account="${i}" aria-pressed="${i === current}"><span class="account-dot dot-${accounts[i].kind}"></span><span class="account-tab-name">${escape(accounts[i].name)}</span><span class="account-tab-detail">${label}</span></button>`).join("")}</div><span class="account-number">AG 0001 <span>·</span> CONTA ${a.accountNumber}-0</span></div>
<div class="dashboard"><div class="main-column"><section class="balance-card theme-${a.kind}" aria-label="Saldo da conta"><div class="balance-content"><div class="balance-label">Saldo disponível <button class="eye-button" id="toggle-balance" aria-label="${hidden ? "Mostrar" : "Ocultar"} valores" aria-pressed="${hidden}">${icon("eye")}</button></div><div class="balance-value">${amountText(a.balance)}</div><span class="status-pill ${a.active ? "" : "inactive"}"><i></i>${a.active ? "Conta ativa" : "Conta inativa"}</span><div class="balance-owner"><span>${escape(a.name)}</span><small>Aurora ${accountLabels[current]} <span>·</span> ${description[current]}</small></div></div><div class="account-details"><span class="account-details-label">IDENTIFICAÇÃO DA CONTA</span><strong>${a.accountNumber}-0</strong><div><span>Agência</span><span>0001</span></div><div><span>Modalidade</span><span>${description[current]}</span></div><div><span>Titular</span><span>${escape(a.name)}</span></div></div></section>
<section class="metrics" aria-label="Resumo das movimentações"><div class="metric"><span class="metric-icon incoming">${icon("down")}</span><div><span>Entradas</span><strong>${amountText(income)}</strong></div><small>Acumulado</small></div><div class="metric"><span class="metric-icon outgoing">${icon("arrow")}</span><div><span>Saídas</span><strong>${amountText(spent)}</strong></div><small>Acumulado</small></div></section>
<section class="panel cashflow" aria-label="Fluxo dos últimos sete dias"><div class="cashflow-header"><div><span class="eyebrow">MOVIMENTAÇÃO</span><h2>Fluxo da semana</h2></div><span class="period-tag">Últimos 7 dias</span></div><div class="cashflow-content"><div class="flow-summary"><span>Resultado do período</span><strong>${amountText(periodIncome - periodExpense)}</strong><div class="chart-legend"><span><i class="legend-in"></i>Entradas</span><span><i class="legend-out"></i>Saídas</span></div></div><div class="flow-chart"><svg viewBox="0 0 350 104" role="img" aria-label="Entradas e saídas diárias nos últimos sete dias"><path d="M0 18H350M0 48H350M0 78H350" stroke="currentColor" opacity=".14" fill="none"/>${flow.map((day, i) => `<g><title>${day.label}: ${hidden ? "valores ocultos" : `entradas ${money(day.income / 100)}, saídas ${money(day.expense / 100)}`}</title><rect class="flow-in" x="${i * 50 + 13}" y="${78 - (hidden ? 0 : (day.income / peak) * 66)}" width="9" height="${hidden ? 0 : (day.income / peak) * 66}" rx="3"/><rect class="flow-out" x="${i * 50 + 25}" y="${78 - (hidden ? 0 : (day.expense / peak) * 66)}" width="9" height="${hidden ? 0 : (day.expense / peak) * 66}" rx="3"/><text x="${i * 50 + 24}" y="99" text-anchor="middle">${day.label}</text></g>`).join("")}</svg></div></div></section>
<section class="panel statement" id="statement"><div class="section-title"><div><span class="eyebrow">ATIVIDADE FINANCEIRA</span><h2>Movimentações</h2></div><button class="text-button" id="export-statement" aria-label="Baixar extrato em CSV">${icon("download")}<span>Exportar</span></button></div><div class="statement-meta"><span>${history.length} ${history.length === 1 ? "movimentação" : "movimentações"} no histórico</span><span class="session-badge">Atualizado agora</span></div><div class="history-tools"><label class="search-field"><span class="sr-only">Buscar movimentações</span><input id="history-search" type="search" placeholder="Buscar no histórico" value="${escape(query)}"></label><label><span class="sr-only">Filtrar por operação</span><select id="history-filter">${[
    ["all", "Todas as operações"],
    ["deposit", "Depósitos"],
    ["withdraw", "Saques"],
    ["loan", "Empréstimos"],
  ]
    .map(
      ([v, n]) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${n}</option>`,
    )
    .join(
      "",
    )}</select></label></div><div class="table-heading"><span>MOVIMENTAÇÃO</span><span>VALOR</span></div><div class="transactions">${
    history.length
      ? history
          .slice(0, expanded ? history.length : 5)
          .map(
            (m) =>
              `<div class="transaction"><span class="transaction-icon ${m.cents > 0 ? "incoming" : "outgoing"}">${icon(m.type === "loan" ? "plus" : m.type === "withdraw" ? "arrow" : "down")}</span><div class="transaction-info"><strong>${escape(m.description || names[m.type])}${a.kind === "bonus" && m.type === "deposit" ? " · bônus" : ""}</strong><small>${new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} <span>·</span> ${kindDescription[a.kind]}</small></div><div class="transaction-right"><strong class="${m.cents > 0 ? "positive" : ""}">${hidden ? "•••••" : `${m.cents > 0 ? "+" : "−"} ${money(Math.abs(m.cents) / 100)}`}</strong><small>${icon("check")}Concluído</small></div></div>`,
          )
          .join("")
      : `<div class="empty">${icon("list")}<h3>Nenhuma movimentação encontrada</h3><p>Faça uma operação ou ajuste os filtros da busca.</p></div>`
  }</div>${history.length > 5 ? `<button id="show-all" class="show-all">${expanded ? "Mostrar menos" : "Ver todas as movimentações"}${icon("chevron")}</button>` : ""}</section>
<section class="learning-note" id="about">${icon("shield")}<div><strong>Informações</strong><p>Ambiente de demonstração com dados fictícios. As movimentações ficam salvas neste dispositivo e não envolvem dinheiro real.</p></div></section></div>
<div class="side-column"><section class="panel operation" id="movement"><div class="section-title"><div><span class="eyebrow">OPERAÇÕES</span><h2>Movimentar conta</h2></div></div><div class="operation-tabs" role="group" aria-label="Tipo de operação">${(["deposit", "withdraw", ...(business ? ["loan"] : [])] as Operation[]).map((op) => `<button data-op="${op}" class="${operation === op ? "selected" : ""}" aria-pressed="${operation === op}">${icon(op === "loan" ? "plus" : op === "withdraw" ? "arrow" : "down")}<span>${names[op]}</span></button>`).join("")}</div><form id="operation-form"><label for="amount">${operation === "deposit" ? "Valor do depósito" : operation === "withdraw" ? "Valor do saque" : "Valor do empréstimo"}</label><div class="money-input"><span>R$</span><input id="amount" value="${escape(amountDraft)}" name="amount" type="number" min="0.01" max="100000000" step="0.01" inputmode="decimal" placeholder="0,00" required aria-describedby="operation-hint" autocomplete="off"></div><div class="presets" aria-label="Valores sugeridos">${[50, 100, 500].map((v) => `<button type="button" data-amount="${v}">${money(v)}</button>`).join("")}</div><label class="description-label" for="description">Descrição <span>opcional</span></label><input class="description-input" id="description" value="${escape(descriptionDraft)}" maxlength="120" placeholder="Ex.: recebimento de projeto"><div class="operation-hint" id="operation-hint">${icon("info")}<p>${a.kind === "bonus" && operation === "deposit" ? "Você recebe <strong>R$10 extras</strong> a cada depósito válido." : operation === "withdraw" ? "O saldo precisa ser maior que o valor do saque." : operation === "loan" ? "Crédito simulado, exclusivo da sua conta empresarial." : "O depósito atualiza o saldo disponível e gera um registro no extrato."}</p></div><button type="submit" class="submit" ${a.active ? "" : "disabled"}>Confirmar ${names[operation].toLowerCase()}${icon("arrow")}</button><div class="notice ${failed ? "error" : "success"}" role="status" aria-live="polite">${notice ? icon(failed ? "info" : "check") + `<span>${escape(notice)}</span>` : ""}</div></form><div class="status-control"><span><i class="${a.active ? "" : "off"}"></i>Conta ${a.active ? "ativa" : "inativa"}</span><button id="status-toggle" type="button">${a.active ? "Desativar" : "Reativar"}</button></div></section><section class="insight"><div class="insight-top"><span class="eyebrow">SUA CONTA</span>${icon("info")}</div><h2>${accountLabels[current]}</h2><p>${a.kind === "bonus" ? "Cada depósito válido recebe um crédito adicional de R$10." : business ? "Depósitos, saques e empréstimos disponíveis para contas ativas." : "Depósitos e saques disponíveis para contas ativas."}</p><div class="rule-row"><span>Condição para saques</span><strong>Saldo maior que o valor solicitado</strong></div><div class="rule-row"><span>Histórico</span><strong>Salvo automaticamente</strong></div><button type="button" id="explore-bonus">Ver conta com bônus ${icon("arrow")}</button></section></div></div>
<footer><a class="footer-brand" href="#overview" aria-label="Aurora Bank início"><img src="/brand/aurora-symbol.svg?v=2" alt="">aurora<span>bank</span></a><span>Aurora Bank</span><span>Demonstração · v1.1</span></footer></main><nav class="mobile-nav" aria-label="Navegação móvel"><a href="#overview" class="active">${icon("grid")}<span>Início</span></a><a href="#movement">${icon("swap")}<span>Movimentar</span></a><a href="#statement">${icon("list")}<span>Extrato</span></a><a href="#about">${icon("info")}<span>Sobre</span></a></nav>`;
  syncNavigation();
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-choice]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          setTheme(button.dataset.themeChoice === "light" ? "light" : "dark")),
    );
  const choose = (i: number) => {
    if (pending) return;
    current = i;
    operation = "deposit";
    notice = "";
    expanded = false;
    query = "";
    filter = "all";
    amountDraft = "";
    descriptionDraft = "";
    render();
  };
  document
    .querySelectorAll<HTMLButtonElement>("[data-account]")
    .forEach((b) => (b.onclick = () => choose(Number(b.dataset.account))));
  document.querySelectorAll<HTMLButtonElement>("[data-op]").forEach(
    (b) =>
      (b.onclick = () => {
        if (pending) return;
        operation = b.dataset.op as Operation;
        notice = "";
        render();
        document.querySelector<HTMLInputElement>("#amount")!.focus();
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-amount]").forEach(
    (b) =>
      (b.onclick = () => {
        const input = document.querySelector<HTMLInputElement>("#amount")!;
        input.value = b.dataset.amount!;
        amountDraft = input.value;
        input.focus();
      }),
  );
  document.querySelector<HTMLButtonElement>("#toggle-balance")!.onclick =
    () => {
      hidden = !hidden;
      render();
      document.querySelector<HTMLButtonElement>("#toggle-balance")!.focus();
    };
  document.querySelector<HTMLButtonElement>("#explore-bonus")!.onclick = () => {
    const index = accounts.findIndex((a) => a.kind === "bonus");
    if (index < 0) {
      openAccountDialog();
      return;
    }
    choose(index);
    document.querySelector("#movement")!.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  document.querySelector<HTMLButtonElement>("#status-toggle")!.onclick =
    async () => {
      if (pending) return;
      pending = true;
      try {
        accounts = (await bank.status(a.id, !a.active)).accounts;
        notice = a.active
          ? "Conta desativada. As operações ficam bloqueadas."
          : "Conta reativada.";
        failed = false;
      } catch (e) {
        notice = e instanceof Error ? e.message : "Erro ao atualizar.";
        failed = true;
      } finally {
        pending = false;
        render();
      }
    };
  const showAll = document.querySelector<HTMLButtonElement>("#show-all");
  if (showAll)
    showAll.onclick = () => {
      expanded = !expanded;
      render();
    };
  document.querySelector<HTMLButtonElement>("#export-statement")!.onclick =
    () => {
      const csv = statementCsv(history);
      download(
        `aurora-extrato-${a.accountNumber}.csv`,
        csv,
        "text/csv;charset=utf-8",
      );
    };
  document.querySelector<HTMLFormElement>("#operation-form")!.onsubmit = async (
    e,
  ) => {
    e.preventDefault();
    if (pending) return;
    const value = Number(
        document.querySelector<HTMLInputElement>("#amount")!.value,
      ),
      description = document
        .querySelector<HTMLInputElement>("#description")!
        .value.trim();
    const fingerprint = JSON.stringify([a.id, operation, value, description]);
    if (intent?.fingerprint !== fingerprint)
      intent = { fingerprint, reference: crypto.randomUUID() };
    pending = true;
    const button = document.querySelector<HTMLButtonElement>(".submit")!;
    button.disabled = true;
    button.textContent = "Processando…";
    try {
      accounts = (
        await bank.move(a.id, operation, value, description, intent.reference)
      ).accounts;
      intent = undefined;
      amountDraft = "";
      descriptionDraft = "";
      notice = `${names[operation]} de ${money(value)} concluído${a.kind === "bonus" && operation === "deposit" ? " com bônus de R$10" : ""}.`;
      failed = false;
    } catch (error) {
      notice =
        error instanceof Error ? error.message : "Não foi possível concluir.";
      failed = true;
    } finally {
      pending = false;
      render();
      document
        .querySelector<HTMLButtonElement>(".submit")!
        .focus({ preventScroll: true });
    }
  };
  document.querySelector<HTMLInputElement>("#amount")!.oninput = (e) => {
    amountDraft = (e.target as HTMLInputElement).value;
  };
  document.querySelector<HTMLInputElement>("#description")!.oninput = (e) => {
    descriptionDraft = (e.target as HTMLInputElement).value;
  };
  document.querySelector<HTMLInputElement>("#history-search")!.oninput = (
    e,
  ) => {
    const input = e.target as HTMLInputElement;
    query = input.value;
    expanded = true;
    render();
    const next = document.querySelector<HTMLInputElement>("#history-search")!;
    next.focus({ preventScroll: true });
  };
  document.querySelector<HTMLSelectElement>("#history-filter")!.onchange = (
    e,
  ) => {
    filter = (e.target as HTMLSelectElement).value;
    expanded = true;
    render();
  };
  document.querySelector<HTMLButtonElement>("#create-account")!.onclick = () =>
    openAccountDialog();
  document.querySelector<HTMLButtonElement>("#backup-data")!.onclick =
    async () => {
      try {
        download(
          `aurora-dados-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(await bank.backup(), null, 2),
          "application/json",
        );
        notice = "Dados exportados.";
        failed = false;
      } catch (e) {
        notice = e instanceof Error ? e.message : "Falha na exportação.";
        failed = true;
      }
      render();
    };
  document.querySelectorAll<HTMLAnchorElement>(".mobile-nav a").forEach(
    (link) =>
      (link.onclick = () => {
        document
          .querySelectorAll(".mobile-nav a")
          .forEach((a) => a.classList.remove("active"));
        link.classList.add("active");
      }),
  );
}
function openAccountDialog() {
  if (creating) return;
  creating = true;
  const dialog = document.createElement("dialog");
  dialog.className = "account-dialog";
  dialog.innerHTML = `<form id="new-account-form"><div class="dialog-header"><div><span class="eyebrow">SEU WORKSPACE</span><h2>Adicionar conta</h2></div><button type="button" id="close-dialog" aria-label="Fechar">${icon("close")}</button></div><p>Escolha a modalidade e informe o titular para começar. Conta de demonstração, sem dinheiro real.</p><label for="account-name">Nome do titular ou negócio</label><input id="account-name" required minlength="2" maxlength="80" placeholder="Ex.: Estúdio Horizonte" autocomplete="off"><label for="account-kind">Modalidade</label><select id="account-kind"><option value="personal">Essencial · depósitos e saques</option><option value="business">Negócios · inclui crédito simulado</option><option value="bonus">Mais · bônus de R$10 por depósito</option></select><div class="dialog-error" role="status"></div><button class="submit" type="submit">Criar conta ${icon("arrow")}</button></form>`;
  document.body.append(dialog);
  dialog.onclose = () => {
    creating = false;
    dialog.remove();
  };
  dialog.querySelector<HTMLButtonElement>("#close-dialog")!.onclick = () =>
    dialog.close();
  dialog.querySelector<HTMLFormElement>("form")!.onsubmit = async (e) => {
    e.preventDefault();
    const button = dialog.querySelector<HTMLButtonElement>(".submit")!;
    button.disabled = true;
    try {
      const result = await bank.create(
        dialog.querySelector<HTMLInputElement>("#account-name")!.value,
        dialog.querySelector<HTMLSelectElement>("#account-kind")!
          .value as AccountKind,
      );
      accounts = result.accounts;
      current = accounts.findIndex((a) => a.id === result.id);
      operation = "deposit";
      query = "";
      filter = "all";
      amountDraft = "";
      descriptionDraft = "";
      notice = "Conta criada. Comece com seu primeiro depósito.";
      failed = false;
      dialog.close();
      render();
    } catch (e) {
      dialog.querySelector(".dialog-error")!.textContent =
        e instanceof Error ? e.message : "Não foi possível criar.";
      button.disabled = false;
    }
  };
  dialog.showModal();
}
async function boot() {
  document.querySelector("#app")!.innerHTML =
    '<div class="boot-state"><img class="boot-brand" src="/brand/aurora-symbol.svg?v=2" alt="Aurora Bank"><h1>Aurora Workspace</h1><p>Conectando suas contas…</p></div>';
  try {
    accounts = (await bank.list()).accounts;
    render();
  } catch (e) {
    document.querySelector("#app")!.innerHTML =
      `<div class="boot-state"><h1>Conexão indisponível</h1><p>${escape(e instanceof Error ? e.message : "Erro ao carregar contas.")}</p><button class="primary-small" id="retry">Tentar novamente</button></div>`;
    document.querySelector<HTMLButtonElement>("#retry")!.onclick = boot;
  }
}
void boot();
