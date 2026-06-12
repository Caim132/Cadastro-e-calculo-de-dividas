/* ============================================================
   Controle de Dívidas
   Lógica principal do app
   ============================================================ */

const STORAGE_KEYS = {
  SETTINGS: "controle_dividas_settings_v1"
};

const state = {
  supabase: null,
  user: null,
  customers: [],
  debts: [],
  settings: loadSettings()
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  mapDomElements();
  setInitialDates();
  bindEvents();

  if (!isSupabaseConfigured()) {
    showSetupWarning();
    return;
  }

  state.supabase = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );

  const { data } = await state.supabase.auth.getSession();
  state.user = data.session?.user ?? null;

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null;
    renderAuthState();
  });

  await renderAuthState();
}

function mapDomElements() {
  dom.setupWarning = document.querySelector("#setup-warning");
  dom.authScreen = document.querySelector("#auth-screen");
  dom.appScreen = document.querySelector("#app-screen");
  dom.loggedUser = document.querySelector("#logged-user");

  dom.authEmail = document.querySelector("#auth-email");
  dom.authPassword = document.querySelector("#auth-password");
  dom.authMessage = document.querySelector("#auth-message");

  dom.customerName = document.querySelector("#customer-name");
  dom.customerCpf = document.querySelector("#customer-cpf");
  dom.customerEmail = document.querySelector("#customer-email");
  dom.customerPhone = document.querySelector("#customer-phone");

  dom.debtCustomer = document.querySelector("#debt-customer");
  dom.debtDescription = document.querySelector("#debt-description");
  dom.debtAmount = document.querySelector("#debt-amount");
  dom.debtStartDate = document.querySelector("#debt-start-date");
  dom.debtRateType = document.querySelector("#debt-rate-type");
  dom.debtRate = document.querySelector("#debt-rate");

  dom.reportCustomer = document.querySelector("#report-customer");
  dom.reportDate = document.querySelector("#report-date");
  dom.reportContent = document.querySelector("#report-content");

  dom.settingSelic = document.querySelector("#setting-selic");

  dom.metricCustomers = document.querySelector("#metric-customers");
  dom.metricDebts = document.querySelector("#metric-debts");
  dom.metricTotal = document.querySelector("#metric-total");

  dom.dashboardCustomersTable = document.querySelector("#dashboard-customers-table");
  dom.customersTable = document.querySelector("#customers-table");
  dom.toast = document.querySelector("#toast");
}

function bindEvents() {
  document.querySelector("#btn-sign-in").addEventListener("click", signIn);
  document.querySelector("#btn-sign-up").addEventListener("click", signUp);
  document.querySelector("#btn-sign-out").addEventListener("click", signOut);

  document.querySelector("#btn-save-customer").addEventListener("click", saveCustomer);
  document.querySelector("#btn-fill-selic").addEventListener("click", fillSelicRate);
  document.querySelector("#btn-save-debt").addEventListener("click", saveDebt);
  document.querySelector("#btn-save-selic").addEventListener("click", saveSelicSetting);
  document.querySelector("#btn-refresh").addEventListener("click", loadAllData);

  dom.debtRateType.addEventListener("change", () => {
    if (dom.debtRateType.value === "Selic de referência") fillSelicRate();
  });

  dom.reportCustomer.addEventListener("change", renderReport);
  dom.reportDate.addEventListener("change", renderReport);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => openTab(tab.dataset.target, tab));
  });
}

function setInitialDates() {
  const today = toISODate(new Date());

  dom.debtStartDate.value = today;
  dom.reportDate.value = today;
  dom.settingSelic.value = state.settings.selicPercent;
}

function isSupabaseConfigured() {
  const config = window.APP_CONFIG ?? {};

  return (
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.includes("COLE_AQUI") &&
    !config.SUPABASE_ANON_KEY.includes("COLE_AQUI")
  );
}

function showSetupWarning() {
  dom.setupWarning.classList.remove("hidden");
  dom.authScreen.classList.add("hidden");
  dom.appScreen.classList.add("hidden");
}

async function renderAuthState() {
  if (state.user) {
    dom.authScreen.classList.add("hidden");
    dom.appScreen.classList.remove("hidden");
    dom.loggedUser.textContent = state.user.email;
    await loadAllData();
    return;
  }

  dom.authScreen.classList.remove("hidden");
  dom.appScreen.classList.add("hidden");
}

async function signUp() {
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;

  if (!email || !password) {
    setAuthMessage("Informe email e senha para criar a conta.");
    return;
  }

  const { error } = await state.supabase.auth.signUp({ email, password });

  if (error) {
    setAuthMessage(getFriendlyError(error));
    return;
  }

  setAuthMessage("Conta criada. Se a confirmação por email estiver ativa, confirme o email antes de entrar.");
}

async function signIn() {
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;

  if (!email || !password) {
    setAuthMessage("Informe email e senha para entrar.");
    return;
  }

  const { error } = await state.supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(getFriendlyError(error));
    return;
  }

  setAuthMessage("");
}

async function signOut() {
  await state.supabase.auth.signOut();
}

function setAuthMessage(message) {
  dom.authMessage.textContent = message;
}

async function loadAllData() {
  if (!state.user) return;

  const { data: customers, error: customersError } = await state.supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (customersError) {
    showToast(`Erro ao carregar clientes: ${getFriendlyError(customersError)}`, true);
    return;
  }

  const { data: debts, error: debtsError } = await state.supabase
    .from("dividas")
    .select("*")
    .order("created_at", { ascending: false });

  if (debtsError) {
    showToast(`Erro ao carregar dívidas: ${getFriendlyError(debtsError)}`, true);
    return;
  }

  state.customers = customers ?? [];
  state.debts = debts ?? [];

  render();
}

async function saveCustomer() {
  const customer = {
    nome: dom.customerName.value.trim(),
    cpf: onlyDigits(dom.customerCpf.value),
    email: dom.customerEmail.value.trim(),
    telefone: dom.customerPhone.value.trim()
  };

  if (!customer.nome) {
    showToast("Informe o nome do cliente.", true);
    return;
  }

  if (!customer.cpf) {
    showToast("Informe o CPF do cliente.", true);
    return;
  }

  const { error } = await state.supabase.from("clientes").insert(customer);

  if (error) {
    showToast(`Erro ao salvar cliente: ${getFriendlyError(error)}`, true);
    return;
  }

  clearCustomerForm();
  await loadAllData();
  showToast("Cliente cadastrado com sucesso.");
}

async function deleteCustomer(customerId) {
  if (!confirm("Excluir este cliente também apagará todas as dívidas dele. Deseja continuar?")) {
    return;
  }

  const { error } = await state.supabase
    .from("clientes")
    .delete()
    .eq("id", customerId);

  if (error) {
    showToast(`Erro ao excluir cliente: ${getFriendlyError(error)}`, true);
    return;
  }

  await loadAllData();
  showToast("Cliente excluído.");
}

async function saveDebt() {
  const debt = {
    cliente_id: dom.debtCustomer.value,
    descricao: dom.debtDescription.value.trim(),
    valor_inicial: Number(dom.debtAmount.value),
    data_inicio: dom.debtStartDate.value,
    juros_anual: Number(dom.debtRate.value) / 100,
    tipo_taxa: dom.debtRateType.value
  };

  if (!debt.cliente_id) {
    showToast("Selecione um cliente.", true);
    return;
  }

  if (!debt.descricao) {
    showToast("Informe a descrição da dívida.", true);
    return;
  }

  if (!debt.valor_inicial || debt.valor_inicial <= 0) {
    showToast("Informe um valor inicial maior que zero.", true);
    return;
  }

  if (!debt.data_inicio) {
    showToast("Informe a data inicial da dívida.", true);
    return;
  }

  if (Number.isNaN(debt.juros_anual) || debt.juros_anual < 0) {
    showToast("Informe uma taxa de juros válida.", true);
    return;
  }

  const { error } = await state.supabase.from("dividas").insert(debt);

  if (error) {
    showToast(`Erro ao salvar dívida: ${getFriendlyError(error)}`, true);
    return;
  }

  clearDebtForm();
  await loadAllData();
  showToast("Dívida cadastrada com sucesso.");
}

async function deleteDebt(debtId) {
  if (!confirm("Deseja excluir esta dívida?")) return;

  const { error } = await state.supabase
    .from("dividas")
    .delete()
    .eq("id", debtId);

  if (error) {
    showToast(`Erro ao excluir dívida: ${getFriendlyError(error)}`, true);
    return;
  }

  await loadAllData();
  showToast("Dívida excluída.");
}

function render() {
  renderDashboard();
  renderCustomers();
  renderCustomerSelects();
  renderReport();
}

function renderDashboard() {
  const today = toISODate(new Date());
  const totalUpdated = state.debts.reduce((sum, debt) => sum + calculateDebtValue(debt, today), 0);

  dom.metricCustomers.textContent = state.customers.length;
  dom.metricDebts.textContent = state.debts.length;
  dom.metricTotal.textContent = formatCurrency(totalUpdated);

  if (state.customers.length === 0) {
    dom.dashboardCustomersTable.innerHTML = emptyRow("Nenhum cliente cadastrado.", 6);
    return;
  }

  dom.dashboardCustomersTable.innerHTML = state.customers.map((customer) => {
    const customerDebts = getDebtsByCustomer(customer.id);
    const customerTotal = customerDebts.reduce((sum, debt) => sum + calculateDebtValue(debt, today), 0);

    return `
      <tr>
        <td>${escapeHTML(customer.nome)}</td>
        <td>${escapeHTML(customer.cpf)}</td>
        <td>${escapeHTML(customer.email || "-")}</td>
        <td>${escapeHTML(customer.telefone || "-")}</td>
        <td>${customerDebts.length}</td>
        <td>${formatCurrency(customerTotal)}</td>
      </tr>
    `;
  }).join("");
}

function renderCustomers() {
  if (state.customers.length === 0) {
    dom.customersTable.innerHTML = emptyRow("Nenhum cliente cadastrado.", 5);
    return;
  }

  dom.customersTable.innerHTML = state.customers.map((customer) => `
    <tr>
      <td>${escapeHTML(customer.nome)}</td>
      <td>${escapeHTML(customer.cpf)}</td>
      <td>${escapeHTML(customer.email || "-")}</td>
      <td>${escapeHTML(customer.telefone || "-")}</td>
      <td>
        <button class="button danger" data-action="delete-customer" data-id="${customer.id}">
          Excluir
        </button>
      </td>
    </tr>
  `).join("");

  dom.customersTable.querySelectorAll("[data-action='delete-customer']").forEach((button) => {
    button.addEventListener("click", () => deleteCustomer(button.dataset.id));
  });
}

function renderCustomerSelects() {
  fillCustomerSelect(dom.debtCustomer);
  fillCustomerSelect(dom.reportCustomer);
}

function fillCustomerSelect(select) {
  const currentValue = select.value;

  if (state.customers.length === 0) {
    select.innerHTML = `<option value="">Nenhum cliente cadastrado</option>`;
    return;
  }

  select.innerHTML = state.customers.map((customer) => `
    <option value="${customer.id}">
      ${escapeHTML(customer.nome)} - CPF ${escapeHTML(customer.cpf)}
    </option>
  `).join("");

  if (state.customers.some((customer) => customer.id === currentValue)) {
    select.value = currentValue;
  }
}

function renderReport() {
  const customerId = dom.reportCustomer.value;
  const reportDate = dom.reportDate.value;
  const customer = state.customers.find((item) => item.id === customerId);

  if (!customer) {
    dom.reportContent.innerHTML = `<p class="muted">Selecione um cliente para ver o relatório.</p>`;
    return;
  }

  const debts = getDebtsByCustomer(customer.id);

  if (debts.length === 0) {
    dom.reportContent.innerHTML = `
      <h3>${escapeHTML(customer.nome)}</h3>
      <p class="muted">Este cliente ainda não possui dívidas cadastradas.</p>
    `;
    return;
  }

  let total = 0;

  const rows = debts.map((debt, index) => {
    const updatedValue = calculateDebtValue(debt, reportDate);
    total += updatedValue;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(debt.descricao)}</td>
        <td>${formatCurrency(debt.valor_inicial)}</td>
        <td>${formatDateBR(debt.data_inicio)}</td>
        <td>${formatPercent(debt.juros_anual)}</td>
        <td>${escapeHTML(debt.tipo_taxa)}</td>
        <td>${formatCurrency(updatedValue)}</td>
        <td>
          <button class="button danger" data-action="delete-debt" data-id="${debt.id}">
            Excluir
          </button>
        </td>
      </tr>
    `;
  }).join("");

  dom.reportContent.innerHTML = `
    <h3>${escapeHTML(customer.nome)}</h3>

    <p>
      <strong>CPF:</strong> ${escapeHTML(customer.cpf)}<br>
      <strong>Email:</strong> ${escapeHTML(customer.email || "-")}<br>
      <strong>Telefone:</strong> ${escapeHTML(customer.telefone || "-")}
    </p>

    <article class="metric-card">
      <span>Total devido atualizado</span>
      <strong>${formatCurrency(total)}</strong>
    </article>

    <br />

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Descrição</th>
            <th>Valor inicial</th>
            <th>Data inicial</th>
            <th>Juros anual</th>
            <th>Tipo de taxa</th>
            <th>Valor atualizado</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  dom.reportContent.querySelectorAll("[data-action='delete-debt']").forEach((button) => {
    button.addEventListener("click", () => deleteDebt(button.dataset.id));
  });
}

function openTab(targetId, selectedTab) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.querySelector(`#${targetId}`).classList.add("active");
  selectedTab.classList.add("active");

  render();
}

function saveSelicSetting() {
  const value = Number(dom.settingSelic.value);

  if (Number.isNaN(value) || value < 0) {
    showToast("Informe uma Selic válida.", true);
    return;
  }

  state.settings.selicPercent = value;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));

  showToast("Selic de referência salva.");
}

function fillSelicRate() {
  dom.debtRate.value = Number(state.settings.selicPercent || 0).toFixed(2);
}

function loadSettings() {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);

  if (stored) {
    return JSON.parse(stored);
  }

  return {
    selicPercent: window.APP_CONFIG?.DEFAULT_SELIC_PERCENT ?? 10.5
  };
}

function getDebtsByCustomer(customerId) {
  return state.debts.filter((debt) => debt.cliente_id === customerId);
}

function calculateDebtValue(debt, calculationDateISO) {
  const startDate = new Date(`${debt.data_inicio}T00:00:00`);
  const calculationDate = new Date(`${calculationDateISO}T00:00:00`);

  const days = (calculationDate - startDate) / (1000 * 60 * 60 * 24);

  if (days <= 0) {
    return Number(debt.valor_inicial);
  }

  const years = days / 365;
  return Number(debt.valor_inicial) * Math.pow(1 + Number(debt.juros_anual), years);
}

function clearCustomerForm() {
  dom.customerName.value = "";
  dom.customerCpf.value = "";
  dom.customerEmail.value = "";
  dom.customerPhone.value = "";
}

function clearDebtForm() {
  dom.debtDescription.value = "";
  dom.debtAmount.value = "";
  dom.debtRateType.value = "Manual";
  dom.debtRate.value = "";
  dom.debtStartDate.value = toISODate(new Date());
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function toISODate(date) {
  return date.toISOString().split("T")[0];
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2).replace(".", ",")}%`;
}

function formatDateBR(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function emptyRow(message, columns) {
  return `<tr><td colspan="${columns}">${escapeHTML(message)}</td></tr>`;
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function showToast(message, isError = false) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");

  if (isError) {
    dom.toast.style.background = "#fef2f2";
    dom.toast.style.borderColor = "#fecaca";
    dom.toast.style.color = "#7f1d1d";
  } else {
    dom.toast.style.background = "";
    dom.toast.style.borderColor = "";
    dom.toast.style.color = "";
  }

  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, 4500);
}

function getFriendlyError(error) {
  const message = error?.message || String(error);

  if (message.includes("Failed to fetch")) {
    return "não foi possível conectar ao Supabase. Confira a URL, a chave pública e se o projeto está ativo.";
  }

  if (message.includes("Invalid login credentials")) {
    return "email ou senha inválidos.";
  }

  if (message.includes("User already registered")) {
    return "este email já possui uma conta.";
  }

  if (message.includes("duplicate key")) {
    return "já existe um registro com essas informações.";
  }

  return message;
}


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const cpfSearch = document.querySelector("#cpf-search");
    if (cpfSearch) {
      cpfSearch.addEventListener("input", () => {
        const filtro = cpfSearch.value.replace(/\D/g,'');
        const linhas = document.querySelectorAll("#customers-table tr");
        linhas.forEach(l => {
          const txt = l.innerText.replace(/\D/g,'');
          l.style.display = txt.includes(filtro) ? "" : "none";
        });
      });
    }
  }, 1000);
});

async function editarCliente(id) {
  const cliente = state.customers.find(c => c.id === id);
  if (!cliente) return;

  const nome = prompt("Nome", cliente.nome);
  if (!nome) return;

  const cpf = prompt("CPF", cliente.cpf);
  const email = prompt("Email", cliente.email || "");
  const telefone = prompt("Telefone", cliente.telefone || "");

  await state.supabase.from("clientes")
    .update({nome, cpf, email, telefone})
    .eq("id", id);

  await loadAllData();
}

async function editarDivida(id) {
  const divida = state.debts.find(d => d.id === id);
  if (!divida) return;

  const descricao = prompt("Descrição", divida.descricao);
  const valor = prompt("Valor", divida.valor_inicial);
  const juros = prompt("Juros (%)", divida.juros_anual * 100);

  await state.supabase.from("dividas")
    .update({
      descricao,
      valor_inicial:Number(valor),
      juros_anual:Number(juros)/100
    })
    .eq("id", id);

  await loadAllData();
}
