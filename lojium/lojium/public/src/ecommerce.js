const storeState = { data: null, cart: [] };
let autoSlideInterval = null;
const CACHE_TTL = 60000;
const getEl = id => document.getElementById(id);



function bubble(type, msg) {
  if (typeof iziToast !== "undefined") {
    iziToast[type === 'error' ? 'error' : type === 'warn' ? 'warning' : 'success']({ title: msg, timeout: 3000 });
  } else alert(`[${type.toUpperCase()}] ${msg}`);
}

function ls_getSlug() {
  return window.location.pathname.split("/").filter(Boolean).pop() || "";
}



document.addEventListener("DOMContentLoaded", () => {
  const path = getEl("body_path")?.dataset.res || "";
  getEl("lojium_ecommerce").style.display = "block"
  if (path === "slugstore") {
    getEl("ecommerce_store") && (getEl("ecommerce_store").style.display = "block");
    lojium_renderstore();
  } else if(path === "ecommerce_marketplace"){
    getEl("ecommerce_marketplace") && (getEl("ecommerce_marketplace").style.display = "block");
    lojium_rendermarketplace();
  }
});

async function lojium_renderstore() {
  const slug = ls_getSlug();
  if (!slug) return console.error("Slug ausente.");

  ls_renderSkeletonUI();
  const cacheKey = `lojium_store_${slug}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

  if (cached && cached.slug === slug && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return renderStoreUI(cached.data);
  }

  try {
    const res = await fetch(`/api/store/${slug}`).then(r => r.json());
    if (!res.status) return bubble("error", res.message || "Erro ao carregar loja.");
    localStorage.setItem(cacheKey, JSON.stringify({ slug, timestamp: Date.now(), data: res }));
    renderStoreUI(res);
  } catch {
    bubble("error", "Erro de conexão ao carregar a loja.");
  }
}

function fixDriveUrl(url) {
  if (!url || typeof url !== "string") return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match?.[1] ? `https://lh3.googleusercontent.com/d/${match[1]}=s1000` : url.trim();
}

function ls_renderImg(src, fallback, className = "", alt = "") {
  const finalUrl = fixDriveUrl(src) || fallback;
  return `<img src="${finalUrl}" class="${className}" alt="${alt}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallback}';">`;
}

function ls_renderSkeletonUI() {
  const app = getEl("store-app") || document.body;
  const skeletons = Array(3).fill(0).map(() => `
    <div class="ls-card">
      <div class="sk-card-img skeleton"></div>
      <div class="sk-line skeleton" style="width:80%;"></div>
      <div class="sk-line skeleton" style="width:40%;"></div>
    </div>`).join('');

  app.innerHTML = `
    <div class="ls-profile-container">
      <div class="ls-cover-wrapper skeleton"></div>
      <div class="ls-store-card">
        <div class="ls-logo-container"><div class="ls-logo-avatar skeleton"></div></div>
        <div class="sk-line skeleton" style="margin:0 auto 8px; width:40%;"></div>
        <div class="sk-line skeleton" style="margin:0 auto; width:25%;"></div>
      </div>
      <div class="ls-products-section"><div class="ls-grid">${skeletons}</div></div>
    </div>`;
}

function renderStoreUI(res) {
  if (!res?.status || !res.store) return;
  storeState.data = res;
  const primaryColor = res.store.branding?.primaryColor || "#10b981";
  document.documentElement.style.setProperty("--p-primary", primaryColor);

  const store = res.store.ecommerce || res.store || {};
  const logo = store.logoUrl?.trim() || "https://placehold.co/150x150?text=Logo";
  const cover = store.coverUrl?.trim() || "https://placehold.co/1000x300/e2e8f0/64748b?text=Lojium";
  const category = store.category || res.store.slug?.toUpperCase() || "LOJA ONLINE";

  const products = (res.products || []).filter(p => p.visibility !== "hide");
  const cards = products.map(p => {
    const images = Array.isArray(p.images) && p.images.length ? p.images : [p.image || logo];
    const description = p.desc || p.description || "Sem descrição disponível.";

    return `
      <div class="ls-card" onclick="ls_openProd('${p.id}')">
        <div class="ls-card-img-wrap">${ls_renderImg(images[0], logo, "", p.name)}</div>
        <div class="ls-card-details">
          <div class="ls-card-title">${p.name}</div>
          <div class="ls-card-desc">${description}</div>
          <div class="ls-card-price">${Number(p.price || 0).toLocaleString("pt-MZ")} MT</div>
        </div>
        <div class="ls-card-btn-wrap">
          <button class="ls-card-btn" onclick="event.stopPropagation(); ls_addToCart('${p.id}')">
            <i class="ri-shopping-basket-2-line"></i> Adicionar ao carrinho
          </button>
        </div>
      </div>`;
  }).join('');

  const app = getEl("store-app") || document.body;
  app.innerHTML = `
    <div class="ls-profile-container">
      <div class="ls-cover-wrapper">
        ${ls_renderImg(cover, cover, "ls-cover-img", "Capa")}
        <div class="ls-top-actions">
          <button class="ls-icon-btn" onclick="history.back()"><i class="ri-arrow-left-s-line"></i></button>
          <button class="ls-icon-btn" onclick="ls_openCart()">
            <i class="ri-shopping-basket-2-line"></i>
            <span class="ls-cart-badge" id="c-count">${ls_getCartCount()}</span>
          </button>
        </div>
      </div>
      <div class="ls-store-card">
        <div class="ls-logo-container">
          ${ls_renderImg(logo, logo, "ls-logo-avatar", store.name)}
        </div>
        <div class="ls-store-info">
          <h1 class="ls-store-name">${store.name || "Nossa Loja"}</h1>
          <span class="ls-store-category">${category}</span>
          <p class="ls-store-desc">${store.description || store.desc || "Seja bem-vindo à nossa loja oficial!"}</p>
        </div>
      </div>

      <div class="ls-products-section">
        <h3 class="ls-section-title">Produtos em Destaque</h3>
        <div class="ls-grid">${cards.length ? cards : '<p style="grid-column:1/-1;text-align:center;padding:30px 0;color:var(--p-muted);">Nenhum produto disponível.</p>'}</div>
      </div>
    </div>`;

  ls_ensureModalsExist();
}

function ls_ensureModalsExist() {
  ['p-modal', 'c-modal'].forEach(id => {
    if (!getEl(id)) {
      const modal = document.createElement("div");
      modal.id = id;
      modal.className = "ls-modal";
      document.body.appendChild(modal);
    }
  });
}

function ls_openProd(id) {
  const p = (storeState.data?.products || []).find(x => String(x.id) === String(id));
  if (!p) return;

  const logo = storeState.data?.store?.logoUrl || "https://placehold.co/400x300?text=Sem+Imagem";
  let images = Array.isArray(p.images) && p.images.length ? p.images : [p.image || logo];
  images = images.map(img => fixDriveUrl(img) || logo);

  ls_ensureModalsExist();
  const modal = getEl("p-modal");

  if (autoSlideInterval) clearInterval(autoSlideInterval);

  const imagesHtml = images.map((img, idx) => `
    <img src="${img}" class="slide-img ${idx === 0 ? 'active' : ''}" alt="${p.name}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${logo}';">
  `).join('');

  modal.innerHTML = `
    <div class="ls-sheet">
      <div class="p-modal-media-slider" id="p-slider">
        <button class="ls-icon-btn" style="position:absolute; top:10px; left:10px; z-index:10; color:#fff;" onclick="ls_closeModal('p-modal')">
          <i class="ri-close-line"></i>
        </button>
        ${imagesHtml}
      </div>
      <div class="p-modal-body">
        <h2 style="font-size:1.05rem; font-weight:700;">${p.name}</h2>
        <p style="color:var(--p-muted); font-size:0.82rem; line-height:1.4;">${p.desc || p.description || 'Sem descrição disponível.'}</p>
        <div style="font-size:1.15rem; font-weight:700; color:var(--p-primary);">${Number(p.price || 0).toLocaleString("pt-MZ")} MT</div>
        <button class="ls-fbtn" style="margin-top:4px;" onclick="ls_addToCart('${p.id}')">Adicionar ao Carrinho</button>
      </div>
    </div>`;


  modal.classList.add("active");

  if (images.length > 1) {
    let currentIndex = 0;
    autoSlideInterval = setInterval(() => {
      const slider = getEl("p-slider");
      if (!slider) return clearInterval(autoSlideInterval);

      const slideElements = slider.querySelectorAll(".slide-img");
      if (!slideElements.length) return;

      slideElements[currentIndex].classList.remove("active");
      currentIndex = (currentIndex + 1) % slideElements.length;
      slideElements[currentIndex].classList.add("active");
    }, 6000);
  }
}

function ls_closeModal(id) {
  if (id === 'p-modal' && autoSlideInterval) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
  getEl(id)?.classList.remove("active");
}

function ls_addToCart(id) {
  const p = (storeState.data?.products || []).find(x => String(x.id) === String(id));
  if (!p) return;

  const idx = storeState.cart.findIndex(x => String(x.id) === String(id));
  if (idx > -1) storeState.cart[idx].qtd++;
  else storeState.cart.push({ id: p.id, name: p.name, price: Number(p.price || 0), qtd: 1 });

  ls_updateCartBadge();
  ls_closeModal('p-modal');
  bubble("success", "Adicionado ao carrinho!");
}

function ls_getCartCount() { return storeState.cart.reduce((a, b) => a + b.qtd, 0); }

function ls_updateCartBadge() {
  const badge = getEl("c-count");
  if (badge) badge.innerText = ls_getCartCount();
}


function ls_openCart() {
  ls_ensureModalsExist();
  const modal = getEl("c-modal");
  if (!modal) return;
  modal.innerHTML = `
    <div class="ls-sheet">
      <div style="padding:20px; border-bottom:1px solid var(--p-border); display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-size: 1.5rem; font-weight:900;">SEU CARRINHO</h3>
        <button class="ls-icon-btn close-btn" style="color: var(--p-text); filter:none;" onclick="ls_closeModal('c-modal')">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div id="c-body" style=" padding:20px; flex:1; overflow-y:auto;">${ls_cartItemsHtml()}</div>
    </div>`;
  modal.classList.add("active");
}

function ls_cartItemsHtml() {
  if (!storeState.cart.length) return `<center><img src="https://i.ibb.co/HpgKZJsv/carrinho-vazio.png" width="80%" alt="carrinho-vazio"></center>`;

  const total = storeState.cart.reduce((a, b) => a + (b.price * b.qtd), 0);
  const list = storeState.cart.map(i => `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <div style="font-weight:600; font-size:0.82rem;">${i.name}</div>
        <small style="color:var(--p-muted);">${i.price.toLocaleString("pt-MZ")} MT</small>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <button style="width:26px; height:26px; border-radius:50%; border:1px solid var(--p-border); background:#fff;" onclick="ls_changeQty('${i.id}', -1)">-</button>
        <span style="font-weight:600; font-size:0.85rem;">${i.qtd}</span>
        <button style="width:26px; height:26px; border-radius:50%; border:1px solid var(--p-border); background:#fff;" onclick="ls_changeQty('${i.id}', 1)">+</button>
      </div>
    </div>`).join('');

  return `${list}
    <div style="margin-top:14px; padding-top:10px; border-top:1px solid var(--p-border); display:flex; justify-content:space-between; font-weight:700; font-size:0.9rem;">
      <span>Total:</span><span>${total.toLocaleString("pt-MZ")} MT</span>
    </div>
    <button class="ls-fbtn" style="margin-top:12px;" onclick="ls_showCheckoutForm()">Finalizar Pedido</button>`;
}

function ls_changeQty(id, delta) {
  const idx = storeState.cart.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return;
  storeState.cart[idx].qtd += delta;
  if (storeState.cart[idx].qtd <= 0) storeState.cart.splice(idx, 1);
  ls_updateCartBadge();
  const cBody = getEl("c-body");
  if (cBody) cBody.innerHTML = ls_cartItemsHtml();
}

function ls_showCheckoutForm() {
  const cBody = getEl("c-body");
  if (!cBody) return;
  cBody.innerHTML = `
    <form onsubmit="event.preventDefault(); ls_submitOrder(this)" style="display:flex; flex-direction:column; gap:10px;">
      <h4 style="font-size:0.9rem;">Dados para Entrega</h4>
      <input type="text" name="name" placeholder="Nome completo" required style="padding:10px 14px; border:1px solid var(--p-border); border-radius:20px; font-size:0.85rem;">
      <input type="tel" name="whatsapp" placeholder="WhatsApp (ex: 841234567)" required style="padding:10px 14px; border:1px solid var(--p-border); border-radius:20px; font-size:0.85rem;">
      <input type="text" name="address" placeholder="Endereço de Entrega" required style="padding:10px 14px; border:1px solid var(--p-border); border-radius:20px; font-size:0.85rem;">
      <button type="submit" class="ls-fbtn" style="margin-top:4px;">Enviar para o WhatsApp</button>
    </form>`;
}

async function ls_submitOrder(form) {
  const btn = form.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.innerHTML = `Processando...`;

  const slug = ls_getSlug();
  const payload = {
    costumer: { name: form.name.value.trim(), whatsapp: form.whatsapp.value.trim(), adress: form.address.value.trim() },
    items: storeState.cart.map(item => ({ id: item.id, qtd: item.qtd }))
  };

  try {
    const res = await fetch(`/api/store/ord/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status) {
      storeState.cart = [];
      ls_updateCartBadge();
      if (res.redirect && res.redirect.startsWith("http")) window.location.href = res.redirect;
      else { ls_closeModal('c-modal'); bubble("success", res.message || "Pedido enviado!"); }
    } else { bubble("error", res.message || "Erro no pedido."); btn.disabled = false; }
  } catch {
    bubble("error", "Erro de conexão.");
    btn.disabled = false;
  }
}