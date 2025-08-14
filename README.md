# Cardápio Digital — React + Vite (custo zero) 🧑‍🍳🚀

Este projeto cria um site de **cardápio digital** que puxa dados em **tempo real** do **Google Sheets** (via Google Apps Script). Estilo inspirado no iFood, com filtros, busca, scroll infinito, variações e botão de pedido via WhatsApp.

## ✅ O que você precisa antes
1. **Node.js (versão LTS)** instalado no computador.
2. Uma conta no **GitHub** (gratuita).
3. Uma conta na **Vercel** (gratuita).

> Se você nunca instalou o Node.js: procure por “Node.js LTS download”, baixe e instale. Depois, abra o **Terminal** (ou **Prompt de Comando**) e confirme com:
>
> ```bash
> node -v
> npm -v
> ```

---

## 🚚 Como rodar no seu computador (passo a passo de leigo)
1. **Baixe** este projeto (arquivo .zip) e **extraia** para uma pasta.
2. Abra a pasta no **VS Code** (ou similar).
3. No menu do VS Code: **Terminal → New Terminal**.
4. No terminal, execute:
   ```bash
   npm install
   npm run dev
   ```
5. O terminal mostrará um endereço como `http://localhost:5173`. Clique nele. Pronto: o site abrirá localmente.

---

## 🔗 Conexão com sua planilha
O projeto já aponta para seu endpoint do Apps Script:
```
https://script.google.com/macros/s/AKfycbyk06kes5V6EnFkQHYQtS_tLhfPyZSZJ3TlXV4Q9vY8sYm_RRTRWvWLu_tYZPbhIaap5w/exec
```
Certifique-se de que o seu **Web App** do Apps Script está **publicado** e com acesso “**Qualquer pessoa com o link**”.

### Estrutura esperada (abas e colunas)
- **Produtos**: `id, nome, descricao, categoria, subcategoria, preco_base, imagem_url, ativo, ordem, (opcional: popularidade, preco_promo)`
- **Variacoes**: `produto_id, tipo_variacao, nome_variacao, preco_extra`
- **Bairros**: `bairros, taxa`
- **Config**: `chave, valor`

### Chaves úteis na aba **Config**
- `brand_name` → Nome do restaurante
- `whatsapp_number` → Número com DDI, ex: `5599999999999` (apenas dígitos)
- `logo_url` → URL da logo
- `accent_color` → Cor principal (ex: `#EA1D2C`)
- `dark_mode_default` → `auto` | `light` | `dark`
- `featured_ids` → IDs em destaque separados por vírgula (ex: `12, 44, 89`)
- `promocoes_ids` → IDs em promoção separados por vírgula
- `min_order` → valor numérico (ex: `39.9`)
- `delivery_open` → `true` ou `false`

---

## 🌐 Publicar de graça na **Vercel** (super simples)
1. Crie um **repositório no GitHub** (Github.com → New → repositório vazio).
2. No terminal, dentro da pasta do projeto, rode:
   ```bash
   git init
   git add .
   git commit -m "Primeiro deploy do Cardápio Digital"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
3. Vá para **vercel.com** → **Add New… → Project** → **Import** o repositório do GitHub.
4. Nas configurações de build, confirme:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Clique em **Deploy**. Em alguns instantes, sua URL pública estará pronta.

> Dica: se depois você mudar o código e fizer `git add . && git commit -m "update" && git push`, a Vercel vai **publicar automático** a nova versão.

---

## 🛠️ Personalização rápida
- **Nome, cor, logo e WhatsApp**: ajuste na **aba Config** da planilha (recomendado) — não precisa mexer no código.
- **URL da Planilha**: se quiser trocar o endpoint, altere `SHEETS_JSON_URL` em `src/App.jsx`.
- **SEO**: o arquivo `index.html` já tem título/descrição; você pode editar lá.

---

## ❓ Dúvidas comuns
- **“A página não mostra produtos”** → Confirme se a aba Produtos tem itens com `ativo = true` e se o Web App está publicado.
- **“Pedido no WhatsApp abre sem número”** → Preencha `whatsapp_number` com **apenas dígitos** na aba Config (ex: `5598999999999`).
- **“As variações não aparecem”** → Preencha a aba **Variacoes** com o `produto_id` de um produto existente.

---

## 📄 Licença
Você pode usar e comercializar este projeto com pequenos comércios. Sem garantia; use por sua conta e risco.
