import React, { useEffect, useMemo, useRef, useState } from "react";

// =============================
// Cardápio Digital — React + Tailwind
// Integração: Google Apps Script (Sheets -> JSON)
// Hospedagem sugerida: Vercel
// =============================

// ⚙️ CONFIG BÁSICA (pode ser sobrescrita pela aba Config da planilha)
const DEFAULT_CONFIG = {
  brand_name: "Seu Restaurante",
  whatsapp_number: "5599999999999", // com DDI
  accent_color: "#EA1D2C", // iFood red
  logo_url: "",
  dark_mode_default: "auto", // "auto" | "light" | "dark"
  seo_description: "Cardápio digital rápido e prático.",
  seo_keywords: "cardápio, delivery, restaurante",
  featured_ids: "", // ids separados por vírgula
  promocoes_ids: "", // ids separados por vírgula
  min_order: "",
  delivery_open: "true",
};

// 🔗 URL do Apps Script que serve o JSON (tempo real)
const SHEETS_JSON_URL =
  "https://script.google.com/macros/s/AKfycbyk06kes5V6EnFkQHYQtS_tLhfPyZSZJ3TlXV4Q9vY8sYm_RRTRWvWLu_tYZPbhIaap5w/exec";

// 📦 Tipos auxiliares (JSDoc para DX)
/**
 * @typedef {Object} Produto
 * @property {string|number} id
 * @property {string} nome
 * @property {string} descricao
 * @property {string} categoria
 * @property {string} subcategoria
 * @property {number|string} preco_base
 * @property {string} imagem_url
 * @property {string|boolean|number} ativo
 * @property {number|string} ordem
 * @property {number|string=} popularidade
 * @property {number|string=} preco_promo
 */

/**
 * @typedef {Object} Variacao
 * @property {string|number} produto_id
 * @property {string} tipo_variacao
 * @property {string} nome_variacao
 * @property {number|string} preco_extra
 */

/**
 * @typedef {Object} Bairro
 * @property {string} bairros
 * @property {number|string} taxa
 */

// 🎯 Utilitários
const moneyBRL = (v) => {
  const n = Number(v || 0);
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const classNames = (...xs) => xs.filter(Boolean).join(" ");

const getConfigValue = (configs, key, fallback = "") => {
  const row = configs?.find((c) => String(c.chave).toLowerCase() === String(key).toLowerCase());
  return row ? String(row.valor) : fallback;
};

const stringIncludes = (hay, needle) => String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase());

// 🌗 Tema escuro/claro (com auto)
const useTheme = (defaultMode = "auto") => {
  const [mode, setMode] = useState(defaultMode);
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
    if (effective === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [mode]);
  return { mode, setMode };
};

// 🔥 Componente principal
export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [produtos, setProdutos] = useState([]); // Produto[]
  const [variacoes, setVariacoes] = useState([]); // Variacao[]
  const [bairros, setBairros] = useState([]); // Bairro[]
  const [configs, setConfigs] = useState([]); // {chave, valor}[]

  // UI state
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [subcategoria, setSubcategoria] = useState("todas");
  const [precoMax, setPrecoMax] = useState(0);
  const [ordenacao, setOrdenacao] = useState("mais_vendidos");

  // Infinite scroll
  const PAGE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef(null);

  // Modal imagem
  const [zoomSrc, setZoomSrc] = useState("");

  // Seleção de variações por produto para o WhatsApp
  const [activeProd, setActiveProd] = useState(null); // Produto | null
  const [selectedVariacoes, setSelectedVariacoes] = useState({}); // {tipo_variacao: nome_variacao}

  // Tema (pode ser sobrescrito pela Config)
  const initialTheme = useMemo(() => {
    return DEFAULT_CONFIG.dark_mode_default;
  }, []);
  const { mode, setMode } = useTheme(initialTheme);

  // Fetch dos dados
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(SHEETS_JSON_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const rawProdutos = data.Produtos || data.produtos || data.ProdutosAtivos || data.ProdutosSheet || data.ProdutosData || [];
        const rawVariacoes = data.Variacoes || data.variacoes || [];
        const rawBairros = data.Bairros || data.bairros || [];
        const rawConfig = data.Config || data.config || data.Configuracoes || [];

        const mapNumber = (x) => (x === null || x === undefined || x === "" ? 0 : Number(String(x).replace(",", ".")) || 0);

        const normProdutos = (rawProdutos || []).map((r) => ({
          id: r.id ?? r.ID ?? r.Id ?? r.codigo ?? r.code ?? "",
          nome: r.nome ?? r.Nome ?? r.titulo ?? r.title ?? "",
          descricao: r.descricao ?? r.Descricao ?? r.desc ?? "",
          categoria: r.categoria ?? r.Categoria ?? "",
          subcategoria: r.subcategoria ?? r.Subcategoria ?? "",
          preco_base: mapNumber(r.preco_base ?? r.preco ?? r.preço ?? r.precoBase ?? r.valor ?? 0),
          imagem_url: r.imagem_url ?? r.imagem ?? r.foto ?? "",
          ativo: r.ativo ?? r.Ativo ?? r.status ?? true,
          ordem: mapNumber(r.ordem ?? r.rank ?? r.posicao ?? 9999),
          popularidade: mapNumber(r.popularidade ?? r.vendidos ?? r.sales ?? 0),
          preco_promo: mapNumber(r.preco_promo ?? r.promocao ?? r.precoPromocional ?? 0),
        })).filter((p) => String(p.ativo).toLowerCase() != "false");

        const normVariacoes = (rawVariacoes || []).map((v) => ({
          produto_id: v.produto_id ?? v.ProdutoID ?? v.id_produto ?? v.pid ?? "",
          tipo_variacao: v.tipo_variacao ?? v.Tipo ?? v.tipo ?? "",
          nome_variacao: v.nome_variacao ?? v.Nome ?? v.nome ?? "",
          preco_extra: mapNumber(v.preco_extra ?? v.extra ?? v.preco ?? 0),
        }));

        const normBairros = (rawBairros || []).map((b) => ({
          bairros: b.bairros ?? b.nome ?? "",
          taxa: mapNumber(b.taxa ?? b.tax ?? b.valor ?? 0),
        }));

        const normConfigs = (rawConfig || []).map((c) => ({
          chave: c.chave ?? c.key ?? c.Config ?? "",
          valor: c.valor ?? c.value ?? c.Val ?? "",
        }));

        if (!alive) return;

        setProdutos(normProdutos);
        setVariacoes(normVariacoes);
        setBairros(normBairros);
        setConfigs(normConfigs);

        const cfgTheme = getConfigValue(normConfigs, "dark_mode_default", DEFAULT_CONFIG.dark_mode_default);
        setMode(["light", "dark", "auto"].includes(cfgTheme) ? cfgTheme : "auto");
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError("Não foi possível carregar os dados do Google Sheets. Verifique o link/permite público.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, [setMode]);

  // Deriva config efetiva
  const config = useMemo(() => {
    const obj = { ...DEFAULT_CONFIG };
    for (const k of Object.keys(DEFAULT_CONFIG)) {
      const v = getConfigValue(configs, k, obj[k]);
      if (v !== undefined && v !== null && v !== "") obj[k] = v;
    }
    return obj;
  }, [configs]);

  // Paleta dinâmica
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", config.accent_color || DEFAULT_CONFIG.accent_color);
  }, [config.accent_color]);

  // Conjuntos de categorias/subcategorias
  const categorias = useMemo(() => {
    const set = new Set(["todas"]);
    produtos.forEach((p) => p.categoria && set.add(p.categoria));
    return Array.from(set);
  }, [produtos]);

  const subcategorias = useMemo(() => {
    const set = new Set(["todas"]);
    produtos
      .filter((p) => (categoria === "todas" ? true : p.categoria === categoria))
      .forEach((p) => p.subcategoria && set.add(p.subcategoria));
    return Array.from(set);
  }, [produtos, categoria]);

  // Preço máximo para filtro (dinâmico)
  useEffect(() => {
    const max = produtos.reduce((m, p) => Math.max(m, Number(p.preco_promo || p.preco_base || 0)), 0);
    setPrecoMax(max);
  }, [produtos]);

  // Filtro + busca + ordenação
  const filtrados = useMemo(() => {
    let list = produtos
      .filter((p) => (categoria === "todas" ? true : p.categoria === categoria))
      .filter((p) => (subcategoria === "todas" ? true : p.subcategoria === subcategoria))
      .filter((p) => (q ? stringIncludes(p.nome, q) || stringIncludes(p.descricao, q) : true))
      .filter((p) => Number(p.preco_promo || p.preco_base) <= clamp(precoMax || Infinity, 0, Infinity));

    if (ordenacao === "mais_vendidos") {
      const hasPopularity = list.some((p) => Number(p.popularidade) > 0);
      if (hasPopularity) list.sort((a, b) => Number(b.popularidade) - Number(a.popularidade));
      else list.sort((a, b) => Number(a.ordem) - Number(b.ordem));
    } else if (ordenacao === "preco_asc") {
      list.sort((a, b) => Number((a.preco_promo || a.preco_base)) - Number((b.preco_promo || b.preco_base)));
    } else if (ordenacao === "preco_desc") {
      list.sort((a, b) => Number((b.preco_promo || b.preco_base)) - Number((a.preco_promo || a.preco_base)));
    } else if (ordenacao === "az") {
      list.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    }

    return list;
  }, [produtos, categoria, subcategoria, q, precoMax, ordenacao]);

  // Infinite scroll observer
  useEffect(() => {
    setVisibleCount(PAGE);
  }, [categoria, subcategoria, q, ordenacao, precoMax]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setVisibleCount((c) => c + PAGE);
      }
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef]);

  const visible = useMemo(() => filtrados.slice(0, visibleCount), [filtrados, visibleCount]);

  // Variações por produto
  const variacoesByProduto = useMemo(() => {
    const map = new Map();
    for (const v of variacoes) {
      const id = String(v.produto_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(v);
    }
    return map;
  }, [variacoes]);

  const tiposVariacao = useMemo(() => {
    if (!activeProd) return [];
    const list = variacoesByProduto.get(String(activeProd.id)) || [];
    const groups = {};
    for (const v of list) {
      const t = v.tipo_variacao || "Opção";
      if (!groups[t]) groups[t] = [];
      groups[t].push(v);
    }
    return Object.entries(groups);
  }, [activeProd, variacoesByProduto]);

  const precoComVariacoes = useMemo(() => {
    if (!activeProd) return 0;
    const base = Number(activeProd.preco_promo || activeProd.preco_base || 0);
    const list = variacoesByProduto.get(String(activeProd.id)) || [];
    const add = list.reduce((sum, v) => {
      const sel = selectedVariacoes[v.tipo_variacao];
      if (sel && sel === v.nome_variacao) return sum + Number(v.preco_extra || 0);
      return sum;
    }, 0);
    return base + add;
  }, [activeProd, selectedVariacoes, variacoesByProduto]);

  const handleChoose = (tipo, nome) => {
    setSelectedVariacoes((s) => ({ ...s, [tipo]: s[tipo] === nome ? undefined : nome }));
  };

  const openPedidoWhats = (produto) => {
    const num = config.whatsapp_number.replace(/\D/g, "");
    const basePreco = moneyBRL(produto.preco_promo || produto.preco_base);
    let text = `Olá! Gostaria de pedir: *${produto.nome}* (${basePreco}).`;
    const list = variacoesByProduto.get(String(produto.id)) || [];
    const chosen = Object.entries(selectedVariacoes).filter(([, v]) => !!v);
    if (list.length && chosen.length) {
      const detalhes = chosen.map(([t, n]) => `${t}: ${n}`).join("; ");
      text += `\nVariações: ${detalhes}.`;
    }
    text += "\nObs: ";
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Destaques/promos via config
  const featuredSet = useMemo(() => new Set(String(config.featured_ids || "").split(",").map((x) => x.trim()).filter(Boolean)), [config.featured_ids]);
  const promoSet = useMemo(() => new Set(String(config.promocoes_ids || "").split(",").map((x) => x.trim()).filter(Boolean)), [config.promocoes_ids]);

  const Brand = () => (
    <div className="flex items-center gap-3">
      {config.logo_url ? (
        <img src={config.logo_url} alt={config.brand_name} className="h-8 w-8 rounded-xl object-cover" />
      ) : (
        <div className="h-8 w-8 rounded-xl" style={{ background: "var(--accent)" }} />
      )}
      <div className="font-semibold text-lg leading-none">
        <span className="text-gray-900 dark:text-gray-100">{config.brand_name}</span>
        <div className="text-xs text-gray-500 dark:text-gray-400">Delivery rápido • {bairros.length} bairros</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-neutral-900/60 border-b border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode((m) => (m === "dark" ? "light" : m === "light" ? "auto" : "dark"))}
              className="px-3 py-1.5 rounded-2xl text-sm border border-black/10 dark:border-white/10 hover:shadow"
              title="Alternar tema"
            >
              Tema: {mode}
            </button>
            <a
              href={`https://wa.me/${String(config.whatsapp_number).replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-2xl text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Barra de busca e filtros */}
      <section className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por prato ou descrição"
              className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-3">
              {categorias.map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
            <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-3">
              {subcategorias.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
            <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-3">
              <option value="mais_vendidos">Mais vendidos</option>
              <option value="az">A–Z</option>
              <option value="preco_asc">Preço: menor → maior</option>
              <option value="preco_desc">Preço: maior → menor</option>
            </select>
            <input type="range" min={0} max={Math.max(50, Math.ceil(precoMax))} value={precoMax}
              onChange={(e) => setPrecoMax(Number(e.target.value))}
              className="accent-[var(--accent)]"
              title="Filtro por preço máximo"
            />
          </div>
        </div>

        {/* Carrossel de categorias */}
        <div className="mt-3 overflow-x-auto">
          <div className="flex gap-2 py-2 min-w-max">
            {categorias.filter((c) => c !== "todas").map((c) => (
              <button key={c} onClick={() => setCategoria(c)}
                className={classNames(
                  "px-4 py-2 rounded-2xl text-sm border border-black/10 dark:border-white/10 whitespace-nowrap",
                  categoria === c ? "text-white" : "",
                )}
                style={categoria === c ? { background: "var(--accent)" } : {}}
              >{c}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      {featuredSet.size > 0 && (
        <section className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold mb-3">Destaques</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {produtos.filter((p) => featuredSet.has(String(p.id))).slice(0, 8).map((p) => (
              <CardProduto key={p.id} p={p} promo={promoSet.has(String(p.id))} onZoom={setZoomSrc} onPedir={() => { setActiveProd(p); setSelectedVariacoes({}); }} />
            ))}
          </div>
        </section>
      )}

      {/* Lista de produtos */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-56 rounded-3xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700/40">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visible.map((p) => (
                <CardProduto key={p.id} p={p} promo={promoSet.has(String(p.id))} onZoom={setZoomSrc} onPedir={() => { setActiveProd(p); setSelectedVariacoes({}); }} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-10" />
            {visible.length < filtrados.length && (
              <div className="text-center text-sm text-gray-500 py-6">Carregando mais itens…</div>
            )}
            {visible.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-12">Nenhum item encontrado com esses filtros.</div>
            )}
          </>
        )}
      </main>

      {/* Modal de imagem */}
      {zoomSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setZoomSrc("")}>
          <img src={zoomSrc} alt="zoom" className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Modal de pedido (variações) */}
      {activeProd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setActiveProd(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 p-4 border border-black/10 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <img src={activeProd.imagem_url} alt={activeProd.nome} className="h-20 w-20 rounded-2xl object-cover" />
              <div className="flex-1">
                <div className="font-semibold text-lg">{activeProd.nome}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{activeProd.descricao}</div>
              </div>
              <button onClick={() => setActiveProd(null)} className="text-sm px-3 py-1.5 rounded-2xl border border-black/10 dark:border-white/10">Fechar</button>
            </div>

            {tiposVariacao.length > 0 && (
              <div className="mt-4 space-y-4">
                {tiposVariacao.map(([tipo, list]) => (
                  <div key={tipo}>
                    <div className="text-sm font-medium mb-2">{tipo}</div>
                    <div className="flex flex-wrap gap-2">
                      {list.map((v, idx) => {
                        const selected = selectedVariacoes[tipo] === v.nome_variacao;
                        return (
                          <button key={tipo + idx}
                            onClick={() => handleChoose(tipo, v.nome_variacao)}
                            className={classNames(
                              "px-3 py-1.5 rounded-2xl text-sm border border-black/10 dark:border-white/10",
                              selected ? "text-white" : ""
                            )}
                            style={selected ? { background: "var(--accent)" } : {}}
                          >
                            {v.nome_variacao} {Number(v.preco_extra) ? `(+${moneyBRL(v.preco_extra)})` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <div className="text-lg font-semibold">Total: {moneyBRL(precoComVariacoes || activeProd.preco_promo || activeProd.preco_base)}</div>
              <button
                onClick={() => openPedidoWhats(activeProd)}
                className="px-4 py-3 rounded-2xl text-white font-medium shadow"
                style={{ background: "var(--accent)" }}
              >
                Pedir no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="mt-12 border-t border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-500 dark:text-gray-400 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} {config.brand_name}. Todos os direitos reservados.
            {config.min_order && (
              <span className="ml-2">Pedido mínimo: {moneyBRL(config.min_order)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>Entrega: {config.delivery_open === "true" ? "aberta" : "fechada"}</span>
            <span className="hidden md:inline">•</span>
            <a href={`https://wa.me/${String(config.whatsapp_number).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CardProduto({ p, promo, onZoom, onPedir }) {
  const preco = Number(p.preco_promo || 0) > 0 ? Number(p.preco_promo) : Number(p.preco_base || 0);
  const temDesconto = Number(p.preco_promo || 0) > 0 && Number(p.preco_promo) < Number(p.preco_base || 0);

  return (
    <div className="card group rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden bg-white dark:bg-neutral-900 transition-all hover:shadow-lg">
      <div className="relative">
        <img
          src={p.imagem_url || "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=60&auto=format&fit=crop"}
          alt={p.nome}
          className="h-40 w-full object-cover cursor-zoom-in"
          onClick={() => onZoom(p.imagem_url)}
        />
        {promo && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs text-white" style={{ background: "var(--accent)" }}>Promo</span>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">{p.categoria}{p.subcategoria ? ` • ${p.subcategoria}` : ""}</div>
        <div className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{p.nome}</div>
        <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 min-h-[2.5rem]">{p.descricao}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="text-lg font-semibold">{moneyBRL(preco)}</div>
          {temDesconto && (
            <div className="text-sm line-through text-gray-400">{moneyBRL(p.preco_base)}</div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onPedir}
            className="flex-1 px-3 py-2 rounded-2xl text-white text-sm font-medium"
            style={{ background: "var(--accent)" }}
          >
            Pedir
          </button>
          <button
            onClick={() => onZoom(p.imagem_url)}
            className="px-3 py-2 rounded-2xl border border-black/10 dark:border-white/10 text-sm"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}
