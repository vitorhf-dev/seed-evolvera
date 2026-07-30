const fieldNames = ["inquiryType", "name", "company", "email", "phone", "reference", "application", "material", "dimensions", "standards", "quantity", "message"];
const validMessage = "Os dados foram validados neste navegador, mas ainda não foram enviados. Este template precisa de uma integração de transporte. Seus dados permanecem preenchidos; use um canal direto abaixo ou configure a integração para continuar.";
const errors = {
  inquiryType: "Selecione o tipo de solicitação.",
  name: "Informe seu nome.",
  company: "Informe a empresa.",
  contact: "Informe pelo menos um e-mail ou telefone.",
  email: "Digite um e-mail válido.",
  phone: "Digite um telefone com DDD ou código do país.",
  application: "Descreva a aplicação ou o contexto.",
  message: "Inclua uma mensagem com o requisito.",
};
const contextMap = new Map([
  ["produto:[[PRODUTO.SLUG]]", { type: "produto", reference: "[[PRODUTO.SLUG]]", label: "[[PRODUTO.NOME]]" }],
  ["servico:[[SERVICO.SLUG]]", { type: "servico", reference: "[[SERVICO.SLUG]]", label: "[[SERVICO.NOME]]" }],
]);

function contextFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("tipo") || params.get("type");
  const reference = params.get("ref") || params.get("reference");
  if (!type || !reference) return null;
  const context = contextMap.get(`${type}:${reference}`);
  return context ? { ...context } : null;
}

function inputFor(form, name) {
  return form.elements.namedItem(name);
}

function setError(form, name, message) {
  const input = inputFor(form, name);
  if (!input) return;
  const element = input instanceof RadioNodeList ? input[0] : input;
  const wrapper = element.closest("label, fieldset") || element.parentElement;
  const id = `${name}-error`;
  let error = form.querySelector(`#${id}`);
  if (!error) {
    error = document.createElement("span");
    error.id = id;
    error.className = "field-error";
    wrapper.append(error);
  }
  error.textContent = message;
  if (input instanceof RadioNodeList) [...input].forEach((radio) => radio.setAttribute("aria-invalid", "true"));
  else input.setAttribute("aria-invalid", "true");
  element.setAttribute("aria-describedby", id);
}

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((error) => error.remove());
  form.querySelectorAll("[aria-invalid]").forEach((input) => {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  });
}

function valuesFrom(form) {
  const values = {};
  fieldNames.forEach((name) => {
    const input = inputFor(form, name);
    values[name] = input instanceof RadioNodeList ? input.value : input?.value || "";
  });
  return values;
}

function validate(form) {
  const values = valuesFrom(form);
  const invalid = [];
  if (!values.inquiryType) invalid.push(["inquiryType", errors.inquiryType]);
  if (!values.name.trim()) invalid.push(["name", errors.name]);
  if (!values.company.trim()) invalid.push(["company", errors.company]);
  if (!values.email.trim() && !values.phone.trim()) invalid.push(["email", errors.contact]);
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) invalid.push(["email", errors.email]);
  if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 7) invalid.push(["phone", errors.phone]);
  if (!values.application.trim()) invalid.push(["application", errors.application]);
  if (!values.message.trim()) invalid.push(["message", errors.message]);
  return { values, invalid };
}

function renderContext(form, context) {
  const host = form.closest("[data-component='form-direct-channels']");
  if (!host) return;
  let summary = host.querySelector("[data-context-summary]");
  if (!summary) {
    summary = document.createElement("div");
    summary.className = "notice context-summary";
    summary.dataset.contextSummary = "";
    host.querySelector(".container")?.prepend(summary);
  }
  summary.textContent = context ? `Assunto selecionado: ${context.label}` : "Nenhum item específico selecionado";
}

export function initInquiryForm() {
  const form = document.querySelector("[data-inquiry-form]");
  if (!form) return;
  const status = form.querySelector("[data-form-status]");
  const summary = form.querySelector("[data-error-summary]");
  const button = form.querySelector("[data-form-submit]");
  const context = contextFromQuery();
  renderContext(form, context);
  if (!status || !summary || !button) return;

  const submit = (event) => {
    event.preventDefault();
    clearErrors(form);
    summary.hidden = true;
    status.textContent = "";
    const result = validate(form);
    if (result.invalid.length) {
      const list = result.invalid.map(([name, message]) => `<li><a href="#${name}">${message}</a></li>`).join("");
      result.invalid.forEach(([name, message]) => setError(form, name, message));
      summary.innerHTML = `<h3>Revise os campos indicados</h3><p>A solicitação não foi preparada. Corrija os itens abaixo; seus dados foram preservados.</p><ul>${list}</ul>`;
      summary.hidden = false;
      summary.focus();
      return;
    }
    form.dispatchEvent(new CustomEvent("seed:inquiry-submit", {
      bubbles: true,
      cancelable: false,
      detail: { values: result.values, context },
    }));
    status.textContent = validMessage;
  };
  form.addEventListener("submit", submit);
  button.addEventListener("click", () => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
