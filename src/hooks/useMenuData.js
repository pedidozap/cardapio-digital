const ENDPOINT = "https://script.google.com/macros/s/AKfycbyk06kes5V6EnFkQHYQtS_tLhfPyZSZJ3TlXV4Q9vY8sYm_RRTRWvWLu_tYZPbhIaap5w/exec";

function normalizeSheetName(name) {
  if (!name) return name;
  const n = name.trim().toLowerCase();
  if (n.includes('produto')) return 'Produtos';
  if (n.includes('variac')) return 'Variacoes';
  if (n.includes('bairro')) return 'Bairros';
  if (n.includes('config')) return 'Config';
  return name;
}

export async function fetchMenu() {
  const res = await fetch(ENDPOINT, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar dados do Google Sheets.");
  const raw = await res.json();

  const mapped = {};
  Object.keys(raw).forEach(k => {
    mapped[normalizeSheetName(k)] = raw[k];
  });

  const produtos = (mapped['Produtos'] || []).filter(p => {
    const ativo = String(p.ativo).toLowerCase();
    return ativo === 'true' || ativo === '1' || ativo === 'sim';
  }).map(p => ({
    id: Number(p.id),
    nome: p.nome?.toString() || '',
    descricao: p.descricao?.toString() || '',
    categoria: p.categoria?.toString() || '',
    subcategoria: p.subcategoria?.toString() || '',
    preco_base: Number(p.preco_base) || 0,
    imagem_url: p.imagem_url?.toString() || '',
    ordem: Number(p.ordem) || 9999,
    popularidade: Number(p.popularidade) || 0,
    preco_promo: p.preco_promo ? Number(p.preco_promo) : null
  })).sort((a,b) => (a.ordem - b.ordem) || (b.popularidade - a.popularidade));

  const variacoes = (mapped['Variacoes'] || []).map(v => ({
    produto_id: Number(v.produto_id),
    tipo_variacao: v.tipo_variacao?.toString() || '',
    nome_variacao: v.nome_variacao?.toString() || '',
    preco_extra: Number(v.preco_extra) || 0
  }));

  const variacoesByProduto = {};
  variacoes.forEach(v => {
    if (!variacoesByProduto[v.produto_id]) variacoesByProduto[v.produto_id] = [];
    variacoesByProduto[v.produto_id].push(v);
  });

  const configArr = mapped['Config'] || [];
  const cfg = {};
  configArr.forEach(row => {
    if (row.chave) cfg[row.chave] = row.valor;
  });

  const config = {
    brand_name: cfg.brand_name || "LeoTech Cardápios",
    logo_url: cfg.logo_url || "",
    whatsapp_number: cfg.whatsapp_number || "5521967594267",
    accent_color: cfg.accent_color || "#EA1D2C",
    dark_mode_default: cfg.dark_mode_default || "auto",
    featured_ids: (cfg.featured_ids || "").toString().split(',').map(s => Number(s.trim())).filter(Boolean),
    promocoes_ids: (cfg.promocoes_ids || "").toString().split(',').map(s => Number(s.trim())).filter(Boolean),
    meta_description: cfg.meta_description || "Cardápio digital com pedido via WhatsApp.",
    keywords: cfg.keywords || "cardápio digital, delivery, whatsapp, LeoTech",
  };

  const produtosFull = produtos.map(p => ({
    ...p,
    variacoes: variacoesByProduto[p.id] || []
  }));

  return { produtos: produtosFull, config };
}
