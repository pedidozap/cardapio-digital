export default function ProductCard({ item, accentColor, whatsapp }) {
  const hasPromo = item.preco_promo && item.preco_promo > 0 && item.preco_promo < item.preco_base;
  const priceBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleOrder = () => {
    const text = `Olá! Tenho interesse no *${item.nome}*%0a${item.descricao ? '- ' + encodeURIComponent(item.descricao) : ''}%0aValor: ${encodeURIComponent(priceBRL(hasPromo ? item.preco_promo : item.preco_base))}`;
    const url = `https://wa.me/${whatsapp}?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={styles.card}>
      <div style={styles.imageWrap}>
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.nome} style={styles.image} loading="lazy" />
        ) : (
          <div style={{...styles.image, ...styles.imagePlaceholder}}>Sem imagem</div>
        )}
      </div>
      <div style={styles.body}>
        <h3 style={styles.title}>{item.nome}</h3>
        {item.descricao && <p style={styles.desc}>{item.descricao}</p>}
        <div style={styles.priceRow}>
          {hasPromo ? (
            <>
              <span style={styles.oldPrice}>{priceBRL(item.preco_base)}</span>
              <span style={{...styles.price, color: accentColor}}>{priceBRL(item.preco_promo)}</span>
            </>
          ) : (
            <span style={{...styles.price, color: accentColor}}>{priceBRL(item.preco_base)}</span>
          )}
        </div>
        <button style={{...styles.btn, background: accentColor}} onClick={handleOrder}>
          Pedir via WhatsApp
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  imageWrap: { width: "100%", position: "relative", paddingTop: "66%" },
  image: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imagePlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#888",
    background: "#f2f2f2",
  },
  body: { padding: 12 },
  title: { fontSize: 16, margin: "0 0 6px" },
  desc: { fontSize: 13, margin: "0 0 10px", color: "#555", lineHeight: 1.35 },
  priceRow: { display: "flex", alignItems: "baseline", gap: 8 },
  oldPrice: { textDecoration: "line-through", color: "#999", fontSize: 13 },
  price: { fontWeight: 700, fontSize: 16 },
  btn: {
    marginTop: 10,
    border: 0,
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700
  }
};
