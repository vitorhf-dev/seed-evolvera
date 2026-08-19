const fieldNames = ["inquiryType", "name", "company", "email", "phone", "reference", "application", "material", "dimensions", "standards", "quantity", "message"];
// Texto para quem preenche o formulário, não para quem instala a seed. A versão anterior dizia
// "este template precisa de uma integração de transporte... configure a integração", explicando a
// própria arquitetura a um possível cliente — a mesma classe do vazamento de marcadores de adaptação.
// A honestidade que importa continua: nunca afirmamos que foi enviado.
const validMessage = "Dados validados. O envio online ainda não está disponível neste site.";
// Só aponta canais quando a página de fato mostra um: a mensagem antiga mandava "use um canal
// direto abaixo" mesmo em página sem telefone, e-mail ou WhatsApp algum.
const channelHint = " Use um dos contatos desta página.";

function hasDirectChannel() {
  return Boolean(document.querySelector('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"]'));
}
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
/* The context map is authored in the page, never in this module. This script is served verbatim and
   is outside the adaptation write-scope, so any catalog literal kept here would reach production
   unchanged. Reading it from the document keeps the data where it can actually be adapted, and an
   absent or malformed block yields an empty map so the form falls back to the generic inquiry path. */
function readContextMap() {
  const source = document.querySelector("template[data-inquiry-context]");
  if (!source) return new Map();
  const entries = [...source.content.querySelectorAll("[data-context-type][data-context-reference]")];
  return new Map(entries.map((entry) => {
    const type = entry.dataset.contextType;
    const reference = entry.dataset.contextReference;
    return [`${type}:${reference}`, { type, reference, label: entry.dataset.contextLabel || reference }];
  }));
}

function contextFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("tipo") || params.get("type");
  const reference = params.get("ref") || params.get("reference");
  if (!type || !reference) return null;
  const context = readContextMap().get(`${type}:${reference}`);
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
    status.textContent = hasDirectChannel() ? validMessage + channelHint : validMessage;
  };
  form.addEventListener("submit", submit);
  button.addEventListener("click", () => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
