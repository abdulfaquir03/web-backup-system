document.addEventListener("DOMContentLoaded", () => {
    const path = document.getElementById("body_path")?.dataset?.res
    const getEl = id => document.getElementById(id)

    getEl("lojium_dashboard").style.display = "block"
    getEl(path).style.display = "block"
    if (typeof lojium_renderprofile === "function") lojium_renderprofile()
})

async function lojium_renderprofile() {
    try {
        const resp = await fetch("/api/users/profile")
        if (!resp.ok) throw new Error(`Status HTTP: ${resp.status}`)
        const profile = await resp.json(); const singleProfile = profile?.data?.profile
        const isArrayData = Array.isArray(profile?.data)
        if (singleProfile && singleProfile.role === "user") {
            lojium_renderuser(profile)
        } else if (isArrayData || (singleProfile && singleProfile.role === "adm")) {
            lojium_renderadm(profile)
        } else {
            console.warn("Estrutura de perfil não reconhecida:", profile)
        }
    } catch (error) {
        bubble("error", "Erro ao renderizar o perfil! " + error.message)
    }
}

function bubble(type, message) {
    const config = { message: message, position: 'topRight', timeout: 4000 }
    if (type === 'error') { iziToast.error({ title: 'Erro', ...config }) }
    else if (type === 'warn' || type === 'warning') { iziToast.warning({ title: 'Atenção', ...config }) }
    else { iziToast.success({ title: 'Sucesso', ...config }) }
}

async function logout() {
    if (confirm('Tem certeza que quer terminar secção?')) {
        const resp = await fetch("/api/users/logout")
        location.href = '/authentication'
        if (await resp.redirected) return
    }
}

function set(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const v = val ?? '';
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = v
    } else {
        el.textContent = v
    }
}


function dashboard_popup(id, action) {
    const popup = document.getElementById(id)
    if (!popup) return;
    if (action === 'open') {
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    if (action === 'close') {
        popup.classList.remove('active');
        document.body.style.overflow = 'auto'
    }
}

function history_nav(section, btn) {
    const pages = ["ecomerce_order", "ecomerce_addproducts", "ecomerce_proctuts"]
    pages.forEach(p => {
        const el = document.getElementById(p)
        if (el) el.style.display = "none"
    })
    const activeEl = document.getElementById(section)
    if (activeEl) activeEl.style.display = "block"
    const buttons = document.querySelectorAll('.popup_body_control_ecomerce button');
    buttons.forEach(b => b.classList.remove("active"))
    if (btn) btn.classList.add("active")
}


function copy_linkecommerce() {
    const slug = window.slug || ''
    if (!slug) return bubble("error", "Slug da loja não encontrado"); const url = `https://www.lojium.shop/${slug}`, ta = document.createElement("textarea")
    ta.value = url
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta); ta.focus(); ta.select();
    try {
        document.execCommand("copy"); bubble("success", "Link copiado com sucesso!");
    } catch {
        bubble("error", "Erro ao copiar link");
    } document.body.removeChild(ta)
}

function lojium_copyCheckoutLink(slug, itemId) {
    const url = `www.lojium.shop/p/${slug}/${itemId}`;
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(url).then(() => bubble("success", "Link copiado!")).catch(() => fallbackCopy(url)); } else { fallbackCopy(url); }
    function fallbackCopy(text) {
        const el = document.createElement("input"); el.value = text; el.style.position = "absolute"; el.style.left = "-9999px"; document.body.appendChild(el); el.focus(); el.select(); el.setSelectionRange(0, 99999);
        try { document.execCommand("copy") ? bubble("success", "Link copiado com sucesso!") : bubble("error", "Erro ao copiar"); } catch { bubble("error", "Erro ao copiar link") } document.body.removeChild(el)
    }
}









//************************************************************************************************* */
function lojium_renderuser(res) {
    try {
        renderProducts(res.data); renderOrdersGrid(res.data)
        const data = res.data
        set('popup_info_user_name', data.profile?.name || '-')
        set('popup_info_user_email', data.email || '-')
        set('popup_info_user_stats', data.profile?.status === true ? 'ACTIVO' : 'BLOQUEADO')
        set('popup_info_user_data', data.profile?.createdAt ? data.profile.createdAt.split(',')[0] : '-')
        let render_order_cont = data.orders || []
        const hoje = new Date(); let diasRestantes = 0

        if (data.ecommerce?.subscription?.periodEnd) {
            const parts = data.ecommerce.subscription.periodEnd.split(', ')[0].split('/')
            const dataFim = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
            const diffTempo = dataFim.getTime() - hoje.getTime()
            diasRestantes = Math.ceil(diffTempo / (1000 * 3600 * 24))
        }
        window.subscription = data.ecommerce?.subscription
        set("info_user_addnumpayment", data.wallet?.transaction_number || '');
        set("dash_userdaterender_unprocessedbalance", `${Number(data.wallet?.unprocessed_total || 0).toFixed(2)} MT`)
        window.slug = data.slug
        set("render_order_cont", render_order_cont.length); set("render_views_cont", data.ecommerce?.metrics?.totalViews || 0)
        set('render_type_contxt', diasRestantes); set('render_dayrest', diasRestantes)
        set("mystore_sluginsert", data.slug || '-'); set("mystore_descinsert", data.ecommerce?.ecommerce?.description || 'Sem descrição');
        set("mystore_whatappinsert", data.ecommerce?.ecommerce?.whatsapp || '-')
        set("mystore_nameinsert", data.ecommerce?.ecommerce?.name || '-')
    } catch (error) {
        console.error("Erro no lojium_renderuser:", error)
    }
}


function renderProducts(data) {
    const container = document.getElementById("render_proctuts_rows");
    if (!container) return; const prods = data?.products || [], slug = data?.slug || "";
    if (!prods.length) return container.innerHTML = `<div class="empty_prods"><i class="ri-inbox-archive-line"></i><p>Nenhum produto encontrado</p></div>`;
    container.innerHTML = prods.map(p => {
        const isHidden = p.visibility === "hidden",
            img = p.images?.[0] || "https://placehold.co/400x300?text=Sem+Imagem",
            views = p.views || 0, itemId = p.slug || p.id
        return `
            <div class="prod_card ${isHidden ? 'is_hidden' : ''}"><div class="prod_img_wrap"><img src="${img}" alt="${p.name}" referrerpolicy="no-referrer"><div class="prod_actions"><button onclick="deleteProduct('${p.id}')" title="Excluir"><i class="ri-delete-bin-6-line"></i></button><button onclick="toggleProductVisibility('${p.id}')" title="Alterar Visibilidade"><i class="${isHidden ? 'ri-eye-off-line' : 'ri-eye-line'}"></i></button><button onclick='openEditProductModal(${JSON.stringify(p).replace(/'/g, "&apos;")}); history_nav("ecomerce_addproducts");' title="Editar">
            <i class="ri-edit-line"></i></button><button onclick="lojium_copyCheckoutLink('${slug}', '${itemId}')" title="Copiar / Compartilhar Link"><i class="ri-share-forward-line"></i></button></div></div><div class="prod_info"><h4>${p.name}</h4><p class="prod_price">${Number(p.price).toLocaleString("pt-MZ")} MT</p><p class="prod_desc">${p.desc || ''}</p><div class="prod_views"><i class="ri-eye-line"></i> <span>${views.toLocaleString("pt-MZ")} visualizações</span></div></div></div>`;
    }).join('')
}


function renderOrdersGrid(data) {
    const prods = data.products || [], fixImg = u => u ? (u.includes("lh3") ? u.split("=")[0] + "=s1000" : u) : "https://placehold.co/80x80?text=Sem+Imagem";
    const statusSel = (o) => `<select class="order-status-select" ${['finalizado', 'rejeitado'].includes(o.status) ? 'disabled' : ''} onchange="updateOrderStatus('${o.id}', this.value, '${o.status}')"><option value="pendente" ${o.status === 'pendente' ? 'selected' : ''}>Pendente</option><option value="finalizado" ${o.status === 'finalizado' ? 'selected' : ''}>Finalizado</option><option value="rejeitado" ${o.status === 'rejeitado' ? 'selected' : ''}>Rejeitado</option></select>`;
    const itemsHtml = (list) => (list || []).map(item => { const p = prods.find(x => x.id === item.id) || {}; return `<div class="order-item-prod">${p.images?.[0] ? `<img src="${fixImg(p.images[0])}" class="order-item-img">` : ''}<div><strong>${p.name || 'Produto Não Encontrado'}</strong><br><small>Qtd: ${item.qtd} | Subtotal: ${((p.price || 0) * item.qtd).toLocaleString('pt-MZ')} MT</small></div></div>`; }).join('');
    const cards = (data.orders || []).map(o => `<div class="order-card"><div class="order-header"><div><strong>Pedido #${o.orderCode || o.id.slice(0, 8)}</strong><span class="order-status badge-${o.status}">${o.status.toUpperCase()}</span></div>${statusSel(o)}</div><div class="order-info"><p><strong>Cliente:</strong> ${o.costumer?.name || 'N/A'} (${o.costumer?.whatsapp || ''})</p><p><strong>Endereço:</strong> ${o.costumer?.adress || 'N/A'}</p>${o.costumer?.note ? `<p><strong>Obs:</strong> ${o.costumer.note}</p>` : ''}<small class="order-date">Data: ${o.creatAt || ''}</small></div><div class="order-products-list"><h4>Produtos</h4>${itemsHtml(o.oreder?.prodct)}</div><div class="order-footer"><span>Total:</span><strong>${(o.oreder?.total_ammount || 0).toLocaleString('pt-MZ')} MT</strong></div></div>`).join('');
    const grid = document.getElementById("render_order_grids"); if (grid) grid.innerHTML = cards.length ? cards : '<p class="empty-orders">Nenhum pedido encontrado.</p>';
}


function previewImg(input, idx) {
    const file = input.files[0], prev = document.getElementById(`img_prev_${idx}`), icon = document.getElementById(`img_icon_${idx}`);
    if (!file) return; const reader = new FileReader(); reader.onload = e => { prev.referrerPolicy = "no-referrer"; prev.src = e.target.result; prev.hidden = false; icon.hidden = true; }; reader.readAsDataURL(file);
}

function openEditProductModal(p) {
    resetProductForm(); document.getElementById("prod_id_input").value = p.id; document.getElementById("prod_name").value = p.name || ""; document.getElementById("prod_price").value = p.price || ""; document.getElementById("prod_desc").value = p.desc || "";
    document.getElementById("prod_form_title").innerText = "EDITAR PRODUTO";
    (p.images || []).slice(0, 3).forEach((url, i) => { if (url) { const prev = document.getElementById(`img_prev_${i}`), icon = document.getElementById(`img_icon_${i}`); prev.referrerPolicy = "no-referrer"; prev.src = url; prev.hidden = false; icon.hidden = true; } });
}

function resetProductForm() {
    document.getElementById("prod_id_input").value = ""; document.getElementById("prod_name").value = ""; document.getElementById("prod_price").value = ""; document.getElementById("prod_desc").value = "";
    document.getElementById("prod_form_title").innerText = "Cadastrar Produto";[0, 1, 2].forEach(i => { document.getElementById(`img_file_${i}`).value = ""; document.getElementById(`img_prev_${i}`).src = ""; document.getElementById(`img_prev_${i}`).hidden = true; document.getElementById(`img_icon_${i}`).hidden = false; });
}

async function deleteProduct(id) { if (!confirm("Tem certeza que deseja excluir este produto?")) return; try { const r = await fetch("/api/prods/destroy", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ id }) }).then(x => x.json()); bubble(r.status ? "success" : "error", r.message); if (r.status && typeof lojium_renderprofile === "function") lojium_renderprofile(); } catch { bubble("error", "Erro ao excluir produto."); } }
async function toggleProductVisibility(id) { try { const r = await fetch("/api/prods/visibility", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ id }) }).then(x => x.json()); bubble(r.status ? "success" : "error", r.message); if (r.status && typeof lojium_renderprofile === "function") lojium_renderprofile(); } catch { bubble("error", "Erro ao alterar visibilidade."); } }


async function saveProduct() {
    const btn = document.getElementById("btn_save_prod"), origText = btn ? btn.innerText : "";
    const id = document.getElementById("prod_id_input").value, name = document.getElementById("prod_name").value.trim(), price = document.getElementById("prod_price").value, desc = document.getElementById("prod_desc").value.trim();
    const imgs = [0, 1, 2].map(i => { const prev = document.getElementById(`img_prev_${i}`); return prev.hidden ? null : { index: i, data: prev.src }; }).filter(Boolean);
    if (!name || !price) return bubble("error", "Nome e preço são obrigatórios.");
    if (!imgs.length) return bubble("error", "Adicione pelo menos 1 imagem.");
    const isEdit = !!id, url = `/api/prods/${isEdit ? "update" : "add"}`, method = isEdit ? "PUT" : "POST";
    const payload = isEdit ? { id, name, price, desc, images: imgs } : { name, price, desc, images: imgs.map(x => x.data) };
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Processando...`; } const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(payload) }).then(r => r.json()); bubble(res.status ? "success" : "error", res.message); if (res.status) { resetProductForm(); if (typeof lojium_renderprofile === "function") lojium_renderprofile(); }
    } catch { bubble("error", "Erro ao processar produto."); } finally { if (btn) { btn.disabled = false; btn.innerText = origText; } }
}

async function info_user_addnumpayment() {
    const btn = document.getElementById("btn-save-numberpay"), num = document.getElementById("info_user_addnumpayment")?.value;
    if (!num || !/^\d{9}$/.test(num.trim())) return bubble('error', 'O número deve conter exatamente 9 dígitos.');
    btn.disabled = true; btn.innerText = 'Salvando...';
    try { const r = await fetch('/api/users/numpayment', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ number: num }) }).then(x => x.json()); bubble(r.status ? 'success' : 'error', r.message); } catch (e) { bubble('error', 'Erro ao salvar número.'); } finally { btn.disabled = false; btn.innerText = 'Salvar'; }
}

async function updateinfostore() {
    const btn = document.querySelector("#mystore_nameinsert")?.closest("form, div")?.querySelector("button") || document.activeElement;
    const name = document.getElementById("mystore_nameinsert")?.value, whatsapp = document.getElementById("mystore_whatappinsert")?.value, description = document.getElementById("mystore_descinsert")?.value;
    if (!name || !name.trim()) return bubble("warn", "O nome da loja é obrigatório.");
    if (btn) { btn.disabled = true; btn.dataset.txt = btn.innerText; btn.innerText = "Salvando..."; }
    try { const d = await fetch("/api/store/update", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") }, body: JSON.stringify({ name, whatsapp, description }) }).then(r => r.json()); bubble(d.status ? "success" : "error", d.message); if (d.status && typeof lojium_renderprofile === "function") lojium_renderprofile(); } catch (e) { bubble("error", "Erro ao atualizar dados da loja."); } finally { if (btn) { btn.disabled = false; btn.innerText = btn.dataset.txt || "Salvar"; } }
}


async function updateOrderStatus(orderId, newStatus, currentStatus) {
    if (['finalizado', 'rejeitado'].includes(currentStatus)) return bubble("warn", "Pedidos finalizados ou rejeitados não podem ter o status alterado.");
    const token = localStorage.getItem("token"); if (!token) return bubble("error", "Sessão expirada. Faça login novamente.");
    try {
        const res = await fetch('/api/store/ord/status', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ orderId, status: newStatus }) }).then(r => r.json());
        if (res.status) { bubble("success", "Status atualizado com sucesso!"); if (typeof lojium_renderprofile === "function") lojium_renderprofile(); } else bubble("error", res.message || "Erro ao atualizar status.");
    } catch { bubble("error", "Erro de conexão ao atualizar status."); }
}












/**********************************************************************/
async function lojium_renderadm(res) {
    try {
        globalUsersData = res.data || []
        renderUsersTable(globalUsersData)
        initCampaignModule(globalUsersData)
        const admUser = globalUsersData.find(u => ["adm", "admin"].includes(u.profile?.role))
        const senders = admUser?.profile?.config?.senderId || []
        const sendersListEl = document.getElementById("admSendersList")
        if (sendersListEl) { sendersListEl.innerHTML = senders.length ? senders.map(s => `<div class="sender-item" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #eee;"><span>${s}</span><i class="ri-delete-bin-line" style="cursor:pointer;color:#dc3545;" onclick="deleteSenderId('${s}')" title="Excluir SenderID"></i></div>`).join('') : '<p style="font-size:12px;color:#888;">Nenhum SenderID cadastrado.</p>'; }
        const totalUnprocessed = globalUsersData.reduce((acc, u) => acc + (Number(u.wallet?.unprocessed_total) || 0), 0); const activeStoresCount = globalUsersData.filter(u => !["adm", "admin"].includes(u.profile?.role) && getDaysRemaining(u.ecommerce?.subscription?.periodEnd) > 0).length;
        set("valueAdmUnprocessedTotal", `${totalUnprocessed.toFixed(2)} MZN`); set("valueAdmActiveStores", activeStoresCount);
    } catch (e) {
        console.log("Erro ao realizar a operação:", e)
    }
}

let globalUsersData = []
function toggleDrawer(idx) { const row = document.getElementById(`drawer-${idx}`); if (row) row.classList.toggle("open"); }
function getDaysRemaining(endDateStr) {
    if (!endDateStr) return 0; const [d, m, yAndTime] = endDateStr.split('/')
    const [y, time] = yAndTime.split(','); const diff = new Date(`${y}-${m}-${d}T${time.trim()}`) - new Date(); return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function filterExpiredUsers() { const expired = globalUsersData.filter(u => getDaysRemaining(u.ecommerce?.subscription?.periodEnd) <= 0); renderUsersTable(expired); }

function renderUsersTable(users) {
    const tbody = document.getElementById("usersTableBody"); if (!users || users.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum usuário encontrado</td></tr>`; return; } set("valueAdmUserActives", globalUsersData.filter(u => u.profile?.status === true).length);
    tbody.innerHTML = users.map((u, i) => {
        const isAdmin = ["adm", "admin"].includes(u.profile?.role)
        const days = getDaysRemaining(u.ecommerce?.subscription?.periodEnd)
        const daysClass = days > 8 ? 'days-green' : (days > 3 ? 'days-yellow' : 'days-red'); const isExpired = days <= 0;
        let icons = isAdmin ? `<i class="ri-user-settings-line" style="color:#aaa;cursor:default;"></i><i class="ri-lock-line" onclick="blockUser('${u.id}')" title="Bloquear Admin"></i><i class="ri-file-info-line" style="color:#aaa;cursor:default;"></i>` : `<i class="ri-arrow-down-s-line" onclick="toggleDrawer(${i})" title="Ver mais"></i> <i class="ri-lock-line" onclick="blockUser('${u.id}')" title="Bloquear Usuario"></i>
        <i class="ri-file-chart-line" onclick="sendReport('${u.id}')" title="Enviar Relatório"></i>${isExpired ? `<i class="ri-notification-badge-line" onclick="sendReminder('${u.id}')" title="Enviar Lembrete"></i>` : ''}`;
        return `<tr><td>${i + 1}</td><td>${u.profile?.name || 'N/A'}</td><td>${u.email}</td> <td><span class="badge-status ${u.profile?.status ? 'active' : 'inactive'}">${u.profile?.status ? 'TRUE' : 'FALSE'}</span></td><td><div class="action-icons">${icons}</div></td></tr>     
            ${!isAdmin ? `  <tr id="drawer-${i}" class="drawer-row"> <td colspan="6" style="border-radius: 30px"> <div class="drawer-container"> <div class="drawer-grid"><div class="drawer-box"><h4>CARTEIRA</h4><p>PROCESSADO: ${u.wallet?.processed_total || 0} MT</p><p>NÃO PROCESSADO: ${u.wallet?.unprocessed_total || 0} MT</p><p>TRANSAÇÕES: ${u.wallet?.total_transactions || 0}</p></div>
            <div class="drawer-box"><h4>E-COMMERCE</h4><p>NOME: ${u.ecommerce?.ecommerce?.name || '-'}</p><p>SLUG: ${u.slug || '-'}</p><p>VENDAS: ${u.ecommerce?.metrics?.totalSales || 0}</p></div><div class="drawer-box"><h4>ASSINATURA</h4><p>CICLO: ${u.ecommerce?.subscription?.billingCycle || 0}</p><p>DIAS RESTANTES: <span class="${daysClass}">${days} DIAS</span></p></div>
            <div class="drawer-box"><h4>RESUMO</h4><p>PRODUTOS: ${u.products?.length || 0}</p><p>PEDIDOS: ${u.orders?.length || 0}</p></div></div></div></td></tr>` : ''}
        `
    }).join('')
}


async function blockUser(id) {
    try {
        const res = await fetch(`/api/users/block/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r => r.json())
        bubble(res.status ? 'success' : 'error', res.message)
        if (res.status && typeof globalUsersData !== 'undefined') lojium_renderprofile();
    } catch (e) { 
        bubble('error', 'Erro ao alterar status do usuário.')
    }
}


let selectedUsers = [], rawCampaignData = []
function initCampaignModule(data) {
    rawCampaignData = Array.isArray(data) ? data : (data?.data || []); const adm = rawCampaignData.find(u => ["adm", "admin"].includes(u.profile?.role))
    const senders = adm?.profile?.config?.senderId || ["Lojium"]
    const sel = document.getElementById("cmpSender"); if (sel) sel.innerHTML = senders.map(s => `<option value="${s}">${s}</option>`).join('')
    const dragEl = document.getElementById("dragPopup"), header = document.getElementById("dragHeader"); if (header && dragEl) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0; header.onmousedown = (e) => {
            e.preventDefault(); p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; }; document.onmousemove = (e) => { e.preventDefault(); p1 = p3 - e.clientX; p2 = p4 - e.clientY; p3 = e.clientX; p4 = e.clientY; dragEl.style.top = (dragEl.offsetTop - p2) + "px"; dragEl.style.left = (dragEl.offsetLeft - p1) + "px"; }
        }
    }
}


function openRecipientPopup() {
    const listEl = document.getElementById("popupList"); if (!listEl) return console.error("Elemento #popupList não encontrado no HTML.");
    if (!rawCampaignData || rawCampaignData.length === 0) { if (typeof globalUsersData !== 'undefined' && globalUsersData.length) rawCampaignData = globalUsersData; else return listEl.innerHTML = '<p style="padding:10px;font-size:12px;color:#666;">Nenhum usuário carregado.</p>'; }
    listEl.innerHTML = rawCampaignData.map(u => {
        const days = calcDays(u.ecommerce?.subscription?.periodEnd); const badgeCls = days <= 0 ? 't-red' : (days <= 3 ? 't-orange' : 't-blue'); const checked = selectedUsers.some(x => x.id === u.id) ? 'checked' : '';
        return ` <div class="user-item"><input type="checkbox" value="${u.id}" ${checked} onchange="toggleSelectUser('${u.id}')"/><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${u.profile?.name || 'Sem Nome'} (${u.email})</span><span class="badge-t ${badgeCls}">${days}d</span></div>`;
    }).join('');
    const popup = document.getElementById("dragPopup"); if (popup) popup.style.display = "block";
}


function calcDays(endDateStr) {
    if (!endDateStr) return 0; try {
        const parts = endDateStr.split(', ')[0].split('/'); const dataFim = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        return Math.ceil((dataFim.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    } catch (e) { return 0; }
}


async function registerSenderId() {
    const senderId = document.getElementById("inputSenderId")?.value;
    try {
        const res = await fetch("/api/users/senderid", { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ senderId }) }).then(r => r.json());
        bubble(res.status ? "success" : "error", res.message); lojium_renderprofile()
    } catch (e) { bubble("error", "Erro ao conectar com o servidor.") }
}

async function deleteSenderId(senderId) {
    try {
        const res = await fetch("/api/users/senderid", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ senderId }) }).then(r => r.json());
        bubble(res.status ? "success" : "error", res.message); if (res.status) lojium_renderprofile()
    } catch (e) { bubble("error", "Erro ao excluir SenderID."); }
}

function toggleSelectUser(id) { 
    const u = rawCampaignData.find(x => x.id === id) 
    if (!u) return; const idx = selectedUsers.findIndex(x => x.id === id)
    if (idx > -1) selectedUsers.splice(idx, 1)
    else selectedUsers.push(u)
}

function closeRecipientPopup() {
    const popup = document.getElementById("dragPopup"); if (popup) popup.style.display = "none";
    const total = selectedUsers.length; const blocked = selectedUsers.filter(u => u.profile?.status === false).length; const trialZero = selectedUsers.filter(u => calcDays(u.ecommerce?.subscription?.periodEnd) <= 0).length; const trialPlus3 = selectedUsers.filter(u => calcDays(u.ecommerce?.subscription?.periodEnd) >= 3).length;
    const metricsEl = document.getElementById("selectedMetrics"); if (metricsEl) metricsEl.innerText = `Destinatários: ${total} | Bloqueados: ${blocked} | Vencidos (0d): ${trialZero} | Válidos (+3d): ${trialPlus3}`;
}

async function sendCampaign() {
    const title = document.getElementById("cmpTitle")?.value
    const message = document.getElementById("cmpMsg")?.value
    const senderId = document.getElementById("cmpSender")?.value
    const emails = selectedUsers.map(u => u.email)
    if (!emails.length || !title || !message || !senderId) return bubble('error', 'Preencha todos os campos e selecione os destinatários.')
    try {
        const res = await fetch('/api/users/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ emails, title, message, senderId }) }).then(r => r.json());
        bubble(res.status ? 'success' : 'error', res.message)
    } catch (e) { 
        bubble('error', 'Erro ao disparar campanha.')
    }
}

const sendReport = (id) => console.log("Enviar Relatório:", id)
const sendReminder = (id) => console.log("Enviar Lembrete:", id)