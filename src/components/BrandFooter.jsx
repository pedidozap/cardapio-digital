export default function BrandFooter() {
  const openWA = () => {
    window.open("https://wa.me/5521967594267", "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 9999,
        background: "rgba(234, 29, 44, 0.95)",
        color: "#fff",
        borderRadius: "14px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
      }}
      title="Fale com LeoTech no WhatsApp"
      onClick={openWA}
    >
      <span>Feito por LeoTech Serviços Digitais</span>
      <span style={{ opacity: 0.9 }}>·</span>
      <span>(21) 96759-4267</span>
    </div>
  );
}
