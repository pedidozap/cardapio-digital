import React, { useEffect, useMemo, useRef, useState } from 'react'
import { fetchMenu } from './hooks/useMenuData.js'
import ProductCard from './components/ProductCard.jsx'
import BrandFooter from './components/BrandFooter.jsx'

const PAGE_SIZE = 12;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [config, setConfig] = useState(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMenu();
        setProdutos(data.produtos || []);
        setConfig(data.config || {});

        const brand = data?.config?.brand_name || "LeoTech Cardápios";
        document.title = brand + " — Cardápio Digital";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", data?.config?.meta_description || "Cardápio digital com pedido via WhatsApp.");
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metaKeywords.setAttribute("content", data?.config?.keywords || "cardápio digital, delivery, whatsapp");

        const ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "name": brand,
          "url": window.location.href,
          "servesCuisine": "Delivery",
          "sameAs": []
        });
        document.head.appendChild(ld);
      } catch (e) {
        console.error(e);
        setError("Não foi possível carregar o cardápio. Verifique a publicação do Apps Script e a estrutura das abas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.descricao || '').toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q) ||
      (p.subcategoria || '').toLowerCase().includes(q)
    );
  }, [query, produtos]);

  const toShow = filtered.slice(0, visibleCount);

  useEffect(() => {
    const onScroll = () => {
      if (loading) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom && visibleCount < filtered.length) {
        setVisibleCount(v => v + PAGE_SIZE);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loading, filtered.length, visibleCount]);

  const accent = config?.accent_color || "#EA1D2C";
  const whatsapp = config?.whatsapp_number || "5521967594267";
  const brand = config?.brand_name || "LeoTech Cardápios";
  const logo = config?.logo_url || "";

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, backdropFilter: "saturate(180%) blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
          {logo ? (
            <img src={logo} alt={brand} style={{ height: 34, width: 34, borderRadius: 8, objectFit: "cover" }} />
          ) : (
            <div style={{ height: 34, width: 34, borderRadius: 8, background: accent }} />
          )}
          <h1 style={{ margin: 0, fontSize: 18 }}>{brand}</h1>
        </div>
        <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "10px 16px" }}>
          <input
            type="search"
            placeholder="Buscar por nome, descrição ou categoria…"
            value={query}
            onChange={(e) => { setVisibleCount(PAGE_SIZE); setQuery(e.target.value); }}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #ddd",
              padding: "0 12px",
              outlineColor: accent,
              fontSize: 14
            }}
          />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }} ref={listRef}>
        {loading && <p style={{ textAlign: "center" }}>Carregando cardápio…</p>}
        {error && <p style={{ color: "#c00", textAlign: "center" }}>{error}</p>}

        {!loading && !error && toShow.length === 0 && (
          <p style={{ textAlign: "center" }}>Nenhum item encontrado.</p>
        )}

        <div style={gridStyles}>
          {toShow.map(item => (
            <ProductCard key={item.id} item={item} accentColor={accent} whatsapp={whatsapp} />
          ))}
        </div>

        {toShow.length < filtered.length && (
          <div style={{ textAlign: "center", padding: 16, color: "#666" }}>
            Role para carregar mais…
          </div>
        )}
      </main>

      <BrandFooter />
    </div>
  );
}

const gridStyles = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 16
};
