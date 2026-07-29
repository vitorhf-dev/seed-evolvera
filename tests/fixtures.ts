import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SiteConfigInput } from "../src/index.js";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (bytes: Buffer): number => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (name: string, data: Buffer): Buffer => { const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, checksum]); };
export const writePng = (path: string, width = 240, height = 180): void => { const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header.set([8, 2, 0, 0, 0], 8); const row = Buffer.alloc(width * 3 + 1); for (let x = 0; x < width; x++) { row[x * 3 + 1] = 28; row[x * 3 + 2] = 103; row[x * 3 + 3] = 91; } const raw = Buffer.concat(Array.from({ length: height }, () => row)); writeFileSync(path, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])); };

const claim = (value: string, label: string) => ({ value, label, provenance: { kind: "caller-supplied" as const, reference: "Registro fornecido para teste" } });
export const serviceConfig = (): SiteConfigInput => ({ schemaVersion: "1", preset: "service-driven", company: { name: "Indústria Exemplo", tagline: "Engenharia que sustenta operações", summary: "Soluções técnicas planejadas para necessidades industriais reais.", primaryCta: { label: "Falar com especialista", href: "#contato" }, contactLinks: [{ label: "Contato", href: "mailto:contato@example.com" }], footerLinks: [{ label: "Início", href: "/" }] }, seo: { title: "Indústria Exemplo | Soluções técnicas", description: "Serviços e soluções industriais com escopo claro, atendimento consultivo e execução responsável." }, theme: { primary: "#145C4A", accent: "#E8A317", shape: "soft", density: "comfortable" }, assets: [], mainNavigation: [{ label: "Início", href: "/" }, { label: "Contato", href: "#contato" }], pages: [{ id: "home", route: "/", pageType: "home", title: "Início", sections: [
  { kind: "hero", id: "inicio", title: "Decisões técnicas para uma operação mais consistente", body: "Da avaliação ao acompanhamento, organizamos cada etapa com clareza e responsabilidade.", actions: [{ label: "Solicitar avaliação", href: "#contato" }] },
  { kind: "proofRail", id: "evidencias", claims: [claim("Atendimento técnico", "Condução próxima em cada etapa"), claim("Escopo claro", "Prioridades documentadas")] },
  { kind: "cardGrid", id: "solucoes", variant: "service", heading: "Serviços organizados em torno da sua necessidade", cards: [{ id: "diagnostico", title: "Diagnóstico", body: "Levantamento técnico para reconhecer contexto, prioridades e próximos passos." }, { id: "execucao", title: "Execução", body: "Condução do escopo aprovado com comunicação objetiva." }] },
  { kind: "splitFeature", id: "autoridade", heading: "Critério técnico do início ao acompanhamento", body: "Uma seção completa mesmo quando nenhuma imagem foi fornecida.", points: ["Leitura do cenário", "Definição de prioridades", "Acompanhamento responsável"] },
  { kind: "metricsBand", id: "indicadores", claims: [claim("Planejamento", "Antes da execução"), claim("Rastreabilidade", "Ao longo do trabalho")] },
  { kind: "processTimeline", id: "processo", heading: "Uma jornada técnica compreensível", steps: [{ id: "entender", title: "Entender", body: "Reunimos contexto e requisitos." }, { id: "propor", title: "Propor", body: "Apresentamos um caminho compatível." }, { id: "acompanhar", title: "Acompanhar", body: "Mantemos o avanço visível." }] },
  { kind: "specGrid", id: "especificacoes", heading: "Informações essenciais", groups: [{ heading: "Atendimento", specs: [{ label: "Abordagem", value: "Consultiva" }, { label: "Registro", value: "Por etapa" }] }] },
  { kind: "faq", id: "duvidas", heading: "Perguntas para começar com segurança", items: [{ question: "Como o trabalho começa?", answer: "Com uma conversa para entender a necessidade e organizar a avaliação." }, { question: "O escopo é apresentado antes?", answer: "Sim. As prioridades e condições são alinhadas antes da execução." }] },
  { kind: "cta", id: "conversa", title: "Vamos entender o seu próximo desafio?", body: "Compartilhe o contexto da operação para iniciarmos uma conversa objetiva.", actions: [{ label: "Entrar em contato", href: "#contato" }] }
]}] });

export const catalogConfig = (withMedia = true): SiteConfigInput => { const config = serviceConfig(); config.preset = "catalog-driven"; config.company.name = "Catálogo Industrial"; if (withMedia) { config.assets = [{ id: "produto", path: "assets/produto.png", role: "product", alt: "Componente industrial em fundo neutro", width: 240, height: 180, provenance: { kind: "caller-staged", source: "fixture sintética", license: "uso em teste" } }]; const page = config.pages[0]!; page.sections.splice(3, 0, { kind: "gallery", id: "galeria", heading: "Seleção de soluções", items: [{ assetId: "produto" }] }); const grid = page.sections.find((item) => item.kind === "cardGrid"); if (grid?.kind === "cardGrid") { grid.variant = "catalog"; grid.cards[0]!.media = { assetId: "produto", treatment: { fit: "contain" } }; } } return config; };

export const multipageConfig = (): SiteConfigInput => {
  const config = catalogConfig();
  config.mainNavigation = [{ label: "Início", href: "/" }, { label: "Manutenção", href: "/servicos/manutencao" }, { label: "Contato", href: "/contato" }];
  config.pages = [
    { id: "manutencao", route: "/servicos/manutencao", pageType: "service", title: "Manutenção", sections: [{ kind: "hero", id: "manutencao-inicio", title: "Manutenção industrial", body: "Atendimento técnico organizado.", actions: [{ label: "Início", href: "/" }], media: { assetId: "produto", treatment: { fit: "contain", cropPolicy: "no-crop" } } }] },
    { ...config.pages[0]!, id: "home", route: "/", pageType: "home" },
    { id: "contato", route: "/contato", pageType: "contact", title: "Contato", sections: [{ kind: "cta", id: "contato-cta", title: "Contato", body: "Converse com a equipe.", actions: [{ label: "Início", href: "/" }] }] },
  ];
  return config;
};
export const hybridConfig = (): SiteConfigInput => { const config = serviceConfig(); config.preset = "hybrid"; config.company.name = "Soluções Industriais Integradas"; const grid = config.pages[0]!.sections.find((item) => item.kind === "cardGrid"); if (grid?.kind === "cardGrid") grid.variant = "sector"; return config; };
export const stageCatalogAssets = (root: string): void => { mkdirSync(join(root, "assets"), { recursive: true }); writePng(join(root, "assets", "produto.png")); };
