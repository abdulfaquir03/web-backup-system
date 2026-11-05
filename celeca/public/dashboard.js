const ROLE = localStorage.celeca_role, ROOT = $('#p-' + ROLE), TOP = ['marketing', 'corretor'].includes(ROLE);
let ME = {}, IMS = [], F = { status: '', temperatura: '', q: '' };
const PAGES = {}, PAL = ['#12a4ec', '#8cc63f', '#0a78b8', '#5f9a1f', '#f5b83d', '#ef6b6b', '#8b7cf6', '#94a3b8'];
const NAV = {
  resumo: ['ri-dashboard-line', 'Resumo'], filiais: ['ri-building-line', 'Filiais'], equipe: ['ri-team-line', 'Equipe'], imoveis: ['ri-home-4-line', 'Imóveis'],
  leads: ['ri-user-star-line', 'Leads'], comunicar: ['ri-mail-send-line', 'Comunicação'], backup: ['ri-database-2-line', 'Backup'], perfil: ['ri-user-settings-line', 'Perfil'], financeiro: ['ri-wallet-3-line', 'Financeiro'],
};
const MENUS = { admin: ['resumo', 'filiais', 'imoveis', 'leads', 'comunicar', 'backup'], filial: ['resumo', 'equipe', 'imoveis', 'leads'], marketing: ['resumo', 'imoveis', 'leads'], corretor: ['resumo', 'imoveis', 'leads'] };
const SK = '<div class="sk bar-sk"></div>'.repeat(4);
const TEMP = [['', 'Não qualificado'], ['frio', 'Frio'], ['morno', 'Morno'], ['quente', 'Quente 🔥']];
const label = k => TOP && k === 'resumo' ? 'Home' : NAV[k][1];

/* ───── utilitários ───── */
const sair = () => { localStorage.removeItem('celeca_token'); localStorage.removeItem('celeca_role'); location.href = '/authentication'; };
addEventListener('unhandledrejection', e => e.preventDefault()); // erros já são mostrados em toast
const call = async (...a) => {
  try { return await api(...a); } catch (e) {
    e.mostrado = true; toast(e.message, 'err');
    if (e.status === 401 || e.status === 403 && /bloquead|suspens/i.test(e.message)) setTimeout(sair, 2200);
    throw e;
  }
};
const patch = (rec, id, body, msg = 'Guardado') => call(`/${rec}/${id}`, body, 'PATCH').then(r => (toast(msg), r));
const fechar = () => $('#modal').innerHTML = '';
const modal = (html, cls = '') => {
  $('#modal').innerHTML = `<div class="mback"><div class="mbox ${cls}"><button class="x" onclick="fechar()"><i class="ri-close-line"></i></button>${html}</div></div>`;
  $('.mback').onclick = e => e.target === e.currentTarget && fechar();
};
const tabela = (cols, rows) => `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${
  rows.map((r, i) => `<tr style="--i:${i}" ${r.attr || ''}>${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="vazio">Sem registos</td></tr>`}</tbody></table></div>`;
const sel = (opts, val, fn) => `<select onchange="${fn}">${opts.map(([v, l]) => `<option value="${v}" ${v == (val ?? '') ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const badge = (v, t) => `<span class="badge ${v}">${t || v}</span>`;
const copiar = t => navigator.clipboard.writeText(t).then(() => toast('Copiado!'));
const baixar = (blob, nome) => Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nome }).click();
const grafico = (id, tipo, labels, data, nome) => new Chart($('#' + id), { type: tipo, data: { labels, datasets: [{ label: nome, data, backgroundColor: PAL, borderRadius: 8 }] }, options: { plugins: { legend: { display: tipo === 'doughnut' } } } });
const linkImovel = i => `${location.origin}/${i.slug}${ME.mkt ? '/' + ME.mkt : ''}`; // marketing: link sempre com o seu código

/* ───── casca (layout) por perfil ───── */
const iniciar = async () => {
  ME = await call('/me');
  const menu = MENUS[ROLE].map(k => `<a href="#/${k}" data-k="${k}"><i class="${NAV[k][0]}"></i><span>${label(k)}</span></a>`).join('');
  const user = `<div class="user"><button class="ub" id="ub" aria-label="Menu do utilizador"><i class="ri-user-3-line"></i></button><div class="pop" id="pop">
    <a href="#/perfil"><i class="ri-user-settings-line"></i>Perfil</a><a href="#/financeiro"><i class="ri-wallet-3-line"></i>Financeiro</a><a href="#" id="sair"><i class="ri-logout-box-r-line"></i>Sair</a></div></div>`;
  ROOT.classList.toggle('top-layout', TOP);
  ROOT.innerHTML = TOP
    ? `<header class="topbar"><img class="logo" src="/logo.jpg" alt="Celeca"><nav class="topnav">${menu}</nav>${user}</header><main id="view"></main>`
    : `<aside class="side" id="side"><div class="brand"><img class="logo" src="/logo.jpg" alt=""><div>Celeca<small>${ROLE === 'admin' ? 'Direcção Geral' : esc(ME.nome || 'Filial')}</small></div></div><nav>${menu}</nav></aside><div class="shade" id="shade"></div>
       <div class="wrap"><header class="topbar"><button id="burger" aria-label="Menu"><i class="ri-menu-line"></i></button><h2 id="titulo"></h2>${user}</header><main id="view"></main></div>`;
  $('#ub').onclick = e => { e.stopPropagation(); $('#pop').classList.toggle('on'); };
  document.addEventListener('click', () => $('#pop').classList.remove('on'));
  $('#sair').onclick = e => { e.preventDefault(); sair(); };
  const gaveta = () => { $('#side').classList.toggle('open'); $('#shade').classList.toggle('on'); };
  if (!TOP) { $('#burger').onclick = gaveta; $('#shade').onclick = gaveta; }
  addEventListener('hashchange', () => { $('#side')?.classList.remove('open'); $('#shade')?.classList.remove('on'); ir(); });
  ir();
};
const ir = () => {
  const k = location.hash.replace('#/', ''), pg = PAGES[k] && (MENUS[ROLE].includes(k) || ['perfil', 'financeiro'].includes(k)) ? k : 'resumo';
  $$('[data-k]', ROOT).forEach(a => a.classList.toggle('on', a.dataset.k === pg));
  if ($('#titulo')) $('#titulo').textContent = label(pg);
  PAGES[pg]($('#view'));
};

/* ───── resumo ───── */
const mktBox = () => `<div class="mktbox"><div><small>O seu código de marketing</small><br><b>${ME.mkt}</b></div><div style="display:flex;gap:.6rem;flex-wrap:wrap">
  <button class="btn sm" onclick="copiar('${ME.mkt}')"><i class="ri-file-copy-line"></i>Copiar código</button>
  <button class="btn sm" onclick="copiar('${location.origin}/?mkt=${ME.mkt}')"><i class="ri-links-line"></i>Link da plataforma</button></div></div>`;
PAGES.resumo = async v => {
  v.innerHTML = SK;
  const s = await call('/stats'), adm = ROLE === 'admin';
  const cards = [['Leads', 'ri-user-star-line', s.totalLeads], ['Imóveis', 'ri-home-4-line', s.totalImoveis], ['Vendas fechadas', 'ri-trophy-line', s.vendas.qtd], ['Faturamento', 'ri-money-dollar-circle-line', mt(s.vendas.valor)], ['Visualizações', 'ri-eye-line', s.views]];
  const meses = Object.keys(s.porMes).sort();
  v.innerHTML = (ROLE === 'marketing' ? mktBox() : '') +
    `<div class="cards">${cards.map(([l, i, n], k) => `<div class="stat" style="animation-delay:${k * 70}ms"><i class="${i}"></i><div><small>${l}</small><b>${n}</b></div></div>`).join('')}</div>
    <div class="graf"><div class="box"><h4>Leads por estado</h4><canvas id="g1"></canvas></div><div class="box"><h4>Vendas por mês (MT)</h4><canvas id="g2"></canvas></div><div class="box"><h4>Imóveis por estado</h4><canvas id="g3"></canvas></div></div>
    ${s.ranking.length ? `<div class="bar"><h3>${adm ? 'Desempenho por filial' : 'Desempenho da equipa'}</h3></div>` + tabela([adm ? 'Filial' : 'Membro', adm ? 'Estado' : 'Cargo', 'Leads', 'Vendas', 'Faturamento', 'Imóveis'],
      s.ranking.map(r => ({ cells: [`<b>${esc(r.nome)}</b>`, adm ? badge(r.status) : r.role, r.leads, r.vendas, mt(r.valor), r.imoveis] }))) : ''}`;
  grafico('g1', 'doughnut', Object.keys(s.leadsStatus).map(k => ST[k]), Object.values(s.leadsStatus));
  grafico('g2', 'bar', meses, meses.map(m => s.porMes[m]), 'MT');
  grafico('g3', 'doughnut', Object.keys(s.imoveisStatus), Object.values(s.imoveisStatus));
};

/* ───── filiais (admin) e equipa (filial) ───── */
const equipePage = (roles, titulo) => async v => {
  v.innerHTML = SK;
  const fil = roles[0] === 'filial', us = (await call('/usuarios')).filter(u => roles.includes(u.role));
  v.innerHTML = `<div class="bar"><h3>${titulo} (${us.length})</h3><button class="btn" onclick="novoUser()"><i class="ri-user-add-line"></i>${fil ? 'Adicionar filial' : 'Recrutar'}</button></div>` +
    tabela([fil ? 'Filial' : 'Nome', fil ? 'Província' : 'Cargo', 'Email', 'Código MKT', 'Estado', 'Acções'], us.map(u => ({ cells: [
      `<b>${esc(u.nome || '—')}</b><small>${esc(u.telefone || '')}</small>`, esc(fil ? u.provincia || '—' : u.role), esc(u.email), u.mkt || '—',
      sel([...(u.status === 'pendente' ? [['pendente', 'Pendente']] : []), ['ativo', 'Ativo'], ['suspenso', 'Suspenso'], ['bloqueado', 'Bloqueado']], u.status, `patch('usuarios',${u.id},{status:this.value},'Estado actualizado')`),
      `<button class="ev" title="Reenviar email de acesso" onclick="call('/usuarios/${u.id}/reenviar',{}).then(()=>toast('Email reenviado'))"><i class="ri-mail-send-line"></i></button>`] })));
};
PAGES.filiais = equipePage(['filial'], 'Filiais');
PAGES.equipe = equipePage(['marketing', 'corretor'], 'Equipa');
const novoUser = () => {
  const adm = ROLE === 'admin';
  modal(`<h3>${adm ? 'Nova filial' : 'Recrutar para a equipa'}</h3><form class="form" id="fu" novalidate>
    ${adm ? '' : '<label class="f"><span>Cargo</span><select name="role"><option value="corretor">Corretor</option><option value="marketing">Marketing</option></select></label>'}
    <label class="f"><span>${adm ? 'Nome da filial (ex.: Filial Maputo)' : 'Nome (opcional — pode ser alterado pelo utilizador)'}</span><input name="nome" ${adm ? 'required' : ''}></label>
    <label class="f"><span>Email</span><input name="email" type="email" required></label>
    ${adm ? '<label class="f"><span>Província / local de actuação</span><input name="provincia" required></label>' : ''}
    <label class="f"><span>Telefone</span><input name="telefone" type="tel"></label>
    <p id="fu-msg" style="color:#c0392b;font-size:.85rem;font-weight:600"></p>
    <button class="btn" type="button" id="fu-btn">Enviar email de convite</button></form>`);

  const f = $('#fu'), btn = $('#fu-btn'), msg = $('#fu-msg');
  const enviar = async () => {
    msg.textContent = '';
    if (!f.reportValidity()) return;
    const dados = Object.fromEntries(new FormData(f));
    btn.classList.add('loading'); btn.disabled = true;
    try {
      const r = await api('/usuarios', dados);
      modal(`<div class="ok"><i class="ri-checkbox-circle-fill"></i><h3>Convite criado</h3>
        <p>Pedimos o envio do email. Se não chegar, copie o link e envie por WhatsApp (válido 24h):</p>
        <input readonly value="${r.link || ''}" onclick="this.select()" style="width:100%;padding:.6rem;border:1.5px solid var(--borda);border-radius:10px">
        <button class="btn sm" onclick="copiar('${r.link || ''}')">Copiar link</button></div>`);
      ir();
    } catch (e) {
      msg.textContent = e.message || 'Erro inesperado';
      toast(e.message || 'Erro inesperado', 'err');
      if (e.status === 401) setTimeout(sair, 1500);
      btn.classList.remove('loading'); btn.disabled = false;
    }
  };
  btn.addEventListener('click', enviar);
  f.addEventListener('submit', e => { e.preventDefault(); enviar(); });
};

/* ───── ficha de autorização: formulário com Selects 100% seguros ───── */
const inp = (n, l, t = 'text', c = '') => `<label class="f ${c}"><span>${l}</span><input name="${n}" type="${t}" ${t === 'number' ? 'min="0" step="any"' : ''}></label>`;

const formFicha = () => `<h3>Cadastro de imóvel / Ficha de autorização</h3><form id="ficha" class="ficha" novalidate>
  <h4>Dados do proprietário</h4>
  <div class="grid">${inp('prop_nome', 'Nome', 'text', 'w2')}${inp('prop_bi', 'BI/DIRE/Passaporte')}${inp('prop_nuit', 'NUIT')}${inp('prop_naturalidade', 'Naturalidade')}${inp('prop_endereco', 'Endereço')}${inp('prop_bairro', 'Bairro')}${inp('prop_cidade', 'Cidade')}${inp('prop_telefone', 'Telefone', 'tel')}${inp('prop_email', 'E-mail', 'email')}</div>
  
  <div class="grid" style="margin-top:1rem">
    <label class="f"><span>Imóvel destinado</span><select name="destino"><option value="venda">Venda</option><option value="arrendamento">Arrendamento</option><option value="ambos">Ambos</option></select></label>
    <label class="f"><span>Tipo de imóvel *</span><select name="tipo" required><option value="">-- Selecione o tipo --</option>${Object.entries(TIPOS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
  </div>

  <div class="grid" style="margin-top:1rem">${inp('endereco', 'Endereço', 'text', 'w2')}${inp('bairro', 'Bairro')}${inp('cidade', 'Cidade')}</div>
  
  <h4>Descrição do imóvel</h4>
  <div class="grid g4">${Object.entries(DET).map(([k, [l]]) => inp('d_' + k, l, 'number')).join('')}</div>
  
  <label class="f" style="margin-top:.8rem"><span>Outros</span><textarea name="outros" rows="2"></textarea></label>
  <label class="f" style="margin-top:.8rem"><span>Descrição para o anúncio no site (opcional)</span><textarea name="descricao" rows="3"></textarea></label>
  
  <div class="grid" style="margin-top:.8rem">${inp('area_construida', 'Área construída (m²)', 'number')}${inp('area_total', 'Área total (m²)', 'number')}${inp('terreno', 'Terreno (m²)', 'number')}</div>
  
  <div class="grid" style="margin-top:1rem">
    <label class="f"><span>Placa</span><select name="placa"><option value="0">Não</option><option value="1">Sim</option></select></label>
    <label class="f"><span>Jornal</span><select name="jornal"><option value="0">Não</option><option value="1">Sim</option></select></label>
    <label class="f"><span>Exclusividade</span><select name="exclusividade"><option value="0">Não</option><option value="1">Sim</option></select></label>
  </div>

  <div class="grid" style="margin-top:1rem">${inp('valor_avaliacao', 'Valor de avaliação (MT)', 'number')}${inp('valor_avaliacao_extenso', 'Avaliação por extenso')}${inp('valor_venda', 'Valor de venda (MT)', 'number')}${inp('valor_venda_extenso', 'Venda por extenso')}${inp('comissao_pct', 'Comissão fixada (%)', 'number')}${inp('comissao_valor', 'Comissão corresponde a (MT)', 'number')}${inp('comissao_extenso', 'Comissão por extenso', 'text', 'w2')}</div>
  <p id="ficha-msg" style="color:#c0392b;font-size:.85rem;font-weight:600;margin-top:.8rem"></p>
  <button class="btn" type="button" id="ficha-btn">Guardar ficha</button></form>`;

const lerFicha = f => {
  const formData = new FormData(f);
  const o = {};
  const det = {};

  for (const [k, v] of formData.entries()) {
    if (k.startsWith('d_')) {
      if (v !== '') det[k.slice(2)] = Number(v);
    } else if (k === 'destino') {
      o.destino = [v];
    } else if (['placa', 'jornal', 'exclusividade'].includes(k)) {
      o[k] = v === '1';
    } else {
      o[k] = v;
    }
  }

  o.detalhes = det;
  return o;
};

const novoImovel = () => {
  modal(formFicha(), 'larga');
  const f = $('#ficha'), btn = $('#ficha-btn'), msg = $('#ficha-msg');
  
  const guardar = async () => {
    msg.textContent = '';
    if (!f.querySelector('[name=tipo]').value) {
      msg.textContent = 'Por favor, selecione o tipo de imóvel.';
      return;
    }
    if (!f.reportValidity()) {
      msg.textContent = 'Preencha todos os campos obrigatórios corretamente.';
      return;
    }

    const dados = lerFicha(f);
    btn.classList.add('loading'); 
    btn.disabled = true;

    try {
      const im = await api('/painel/imoveis', dados);
      IMS.push(im);
      modal(`<div class="ok"><i class="ri-checkbox-circle-fill"></i><h3>Imóvel ${im.codigo} registado!</h3><p>Descarregue a ficha para assinatura e adicione as imagens (até 6).</p>
        <button class="btn" onclick="pdf(${im.id})"><i class="ri-file-pdf-2-line"></i>Baixar ficha para assinatura</button>
        <button class="btn alt" onclick="imagens(${im.id})"><i class="ri-image-add-line"></i>Adicionar imagens</button></div>`);
      ir();
    } catch (e) {
      console.error('[novoImovel] erro', e);
      msg.textContent = e.message || 'Erro inesperado ao guardar imóvel.';
      toast(e.message || 'Erro inesperado', 'err');
      if (e.status === 401) setTimeout(sair, 1500);
      btn.classList.remove('loading'); 
      btn.disabled = false;
    }
  };
  
  btn.onclick = guardar; 
  f.onsubmit = e => { e.preventDefault(); guardar(); };
};

const dataURL = u => fetch(u).then(r => r.blob()).then(b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }));
const pdf = async id => {
  const im = IMS.find(i => Number(i.id) === Number(id)) || (await call('/painel/imoveis')).find(i => Number(i.id) === Number(id));
  if (!im) { toast('Imóvel não encontrado', 'err'); return; }
  
  const d = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const dd = new Date(im.createdAt || Date.now());
  const n = v => v == null ? '' : mt(v);
  const m2 = v => v == null ? '' : `${+v} m²`;
  
  const t = (s, x, y, o = {}) => { d.setFont('times', o.b ? 'bold' : o.i ? 'italic' : 'normal').setFontSize(o.s || 10.5); d.text(String(s ?? ''), x, y, o.a ? { align: o.a } : undefined); };
  const campo = (l, v, x, y, w) => { t(l, x, y); const lx = x + d.getTextWidth(l) + 1; d.line(lx, y + .8, x + w, y + .8); t(v, lx + 1, y - .3); };
  const cb = (l, on, x, y) => { t(l, x, y); const bx = x + d.getTextWidth(l) + 2; d.rect(bx, y - 3.4, 4, 4); on && t('X', bx + .8, y - .2, { b: 1 }); return bx + 9; };
  const titulo = (s, y) => { t(s, 20, y, { b: 1, s: 11.5 }); d.line(20, y + 1, 20 + d.getTextWidth(s), y + 1); };
  const par = (l, v, ext, y) => { campo(l, v, 20, y, 75); t('(', 98, y); d.line(100, y + .8, 185, y + .8); t(ext || '', 101, y - .3); t(')', 187, y); };
  
  try {
    const logoBase64 = await dataURL('/logo.jpg').catch(() => null);
    if (logoBase64) d.addImage(logoBase64, 'JPEG', 85, 8, 40, 40);
  } catch(err) {}

  t('FICHA DE AUTORIZAÇÃO', 105, 56, { b: 1, s: 13, a: 'center' });
  titulo('DADOS DO PROPRIETÁRIO', 66);
  campo('Nome:', im.prop_nome, 20, 73, 170); campo('BI/DIRE/Passaporte:', im.prop_bi, 20, 79.5, 105); campo('NUIT:', im.prop_nuit, 130, 79.5, 60);
  campo('Naturalidade', im.prop_naturalidade, 20, 86, 70); campo('Endereço:', im.prop_endereco, 95, 86, 95);
  campo('Bairro:', im.prop_bairro, 20, 92.5, 90); campo('Cidade:', im.prop_cidade, 115, 92.5, 75);
  campo('Telefone:', im.prop_telefone, 20, 99, 90); campo('E-mail', im.prop_email, 115, 99, 75);
  t('Imóvel destinado', 20, 107); let x = 52; Object.entries(DESTINOS).reverse().forEach(([k, l]) => x = cb(l, im.destino?.includes(k), x + 4, 107) + 4);
  titulo('DADOS DO IMÓVEL', 117); t('Tipo:', 20, 124); x = 31; Object.entries(TIPOS).forEach(([k, l]) => x = cb(l, im.tipo === k, x, 124));
  campo('Endereço:', im.endereco, 20, 131, 170); campo('Bairro:', im.bairro, 20, 137.5, 105); campo('Cidade:', im.cidade, 130, 137.5, 60);
  titulo('DESCRIÇÃO DO IMÓVEL:', 147);
  Object.entries(DET).forEach(([k, [l]], i) => { const cx = 20 + 65 * Math.floor(i / 6), y = 154 + 6.3 * (i % 6); d.line(cx, y + .8, cx + 9, y + .8); t(im.detalhes?.[k] ?? '', cx + 3, y - .3); t(l, cx + 11, y); });
  campo('Outros:', im.outros, 20, 193, 170); d.line(20, 199.5, 190, 199.5); d.line(20, 206, 190, 206);
  campo('Área Construída:', m2(im.area_construida), 20, 214, 55); campo('Área Total:', m2(im.area_total), 80, 214, 55); campo('Terreno:', m2(im.terreno), 140, 214, 50);
  t('Placa:', 20, 221); x = cb('Sim', im.placa, 33, 221); cb('Não', !im.placa, x, 221); t('Jornal:', 105, 221); x = cb('Sim', im.jornal, 120, 221); cb('Não', !im.jornal, x, 221);
  par('Valor Avaliação', n(im.valor_avaliacao), im.valor_avaliacao_extenso, 228); par('Valor de Venda:', n(im.valor_venda), im.valor_venda_extenso, 234.5);
  campo('Comissão Fixada em', im.comissao_pct ?? '', 20, 241, 60); t('% que corresponde a', 82, 241); d.line(122, 241.8, 175, 241.8); t(n(im.comissao_valor), 123, 240.7); t('MT', 177, 241);
  t('(', 20, 247.5); d.line(22, 248.3, 185, 248.3); t(im.comissao_extenso || '', 23, 247.2); t(')', 187, 247.5);
  const ex = !!im.exclusividade, decl = `Declaro ser o legítimo proprietário/responsável do imóvel. Autorizo a CeLeCa Imobiliária a oferecer o referido imóvel, através de anúncios em Jornais ou placa/faixa, afixadas no imóvel, inclusive através da internet e Televisão, com (${ex ? 'X' : '  '}) ou sem (${ex ? '  ' : 'X'}) exclusividade. Caso desistir desta autorização, por qualquer razão, comprometo-me avisar.`;
  d.setFont('times', 'italic').setFontSize(10); d.text(d.splitTextToSize(decl, 170), 20, 256, { lineHeightFactor: 1.35 });
  t(`Nampula, ${String(dd.getDate()).padStart(2, '0')}/${String(dd.getMonth() + 1).padStart(2, '0')}/${dd.getFullYear()}.`, 105, 277, { a: 'center' });
  d.line(20, 288, 80, 288); d.line(125, 288, 190, 288); t('Responsável', 50, 292.5, { b: 1, a: 'center' }); t('Proprietário', 157, 292.5, { b: 1, a: 'center' });
  t(`Ref. ${im.codigo}`, 20, 294, { s: 7 });
  d.save(`ficha-autorizacao-${im.codigo}.pdf`);
};

/* ───── imóveis e gestão de imagens ───── */
/* ───── gestão de imagens corrigida e infalível ───── */
const comprimir = f => new Promise(ok => {
  const i = new Image();
  i.onload = () => { const r = Math.min(1, 1280 / Math.max(i.width, i.height)), c = Object.assign(document.createElement('canvas'), { width: i.width * r, height: i.height * r }); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .75).split(',')[1]); };
  i.src = URL.createObjectURL(f);
});

const imagens = id => {
  const im = IMS.find(i => Number(i.id) === Number(id));
  if (!im) return;
  const n = (im.imagens || []).length;
  
  modal(`<h3>Imagens · ${im.codigo} (${n}/6)</h3>
    <div class="gal">${(im.imagens || []).map((u, k) => `<div style="background-image:url('${esc(u)}')"><button type="button" onclick="rmImg(${id},${k})" title="Remover"><i class="ri-delete-bin-line"></i></button></div>`).join('') || '<p class="vazio">Ainda sem imagens.</p>'}</div>
    ${n < 6 ? `<button class="btn" type="button" id="btn-add-img-${id}"><i class="ri-upload-2-line"></i>Adicionar imagem</button>` : '<p>Limite de 6 imagens atingido.</p>'}`);

  // Anexa o evento de forma programática e segura ao botão recém-criado na modal
  const btn = document.getElementById(`btn-add-img-${id}`);
  if (btn) {
    btn.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = e => {
        if (e.target.files[0]) addImg(id, e.target);
      };
      inp.click();
    };
  }
};

const addImg = async (id, inp) => {
  if (!inp.files[0]) return;
  try {
    toast('A comprimir imagem...', 'warn');
    const base64 = await comprimir(inp.files[0]);
    const imRes = await call(`/painel/imoveis/${id}/imagem`, { image: base64 });
    const imLocal = IMS.find(i => Number(i.id) === Number(id));
    if (imLocal) imLocal.imagens = imRes.imagens;
    toast('Imagem adicionada com sucesso!');
    imagens(id);
    ir();
  } catch (e) {
    console.error('[addImg] erro:', e);
  }
};

const rmImg = async (id, k) => {
  try {
    const imRes = await call(`/painel/imoveis/${id}/imagem/${k}`, null, 'DELETE');
    const imLocal = IMS.find(i => Number(i.id) === Number(id));
    if (imLocal) imLocal.imagens = imRes.imagens;
    toast('Imagem removida');
    imagens(id);
    ir();
  } catch (e) {
    console.error('[rmImg] erro:', e);
  }
};

const pim = (id, k, v) => patch('painel/imoveis', id, { [k]: v }).then(ir, ir);

PAGES.imoveis = async v => {
  v.innerHTML = SK; IMS = await call('/painel/imoveis');
  const pode = i => ROLE !== 'marketing' && ROLE !== 'corretor' || i.criador_id === ME.id;
  v.innerHTML = `<div class="bar"><h3>Imóveis (${IMS.length})</h3>${ROLE !== 'admin' ? '<button class="btn" onclick="novoImovel()"><i class="ri-add-line"></i>Cadastrar imóvel</button>' : ''}</div>` +
    tabela(['', 'Código', 'Imóvel', 'Valor', 'Estado', 'Vistas', 'Criado por', 'Eventos'], IMS.map(i => ({ cells: [
      `<div class="thumb" style="${i.imagens[0] ? `background-image:url('${esc(i.imagens[0])}')` : ''}"></div>`,
      `<b>${i.codigo}</b>${i.exclusividade ? '<small>⭐ Exclusivo</small>' : ''}`,
      `<b>${esc(TIPOS[i.tipo] || '')}</b><small>${esc([i.bairro, i.cidade].filter(Boolean).join(', '))}</small>`, mt(i.valor_venda),
      pode(i) ? sel([['disponivel', 'Disponível'], ['vendido', 'Vendido'], ['indisponivel', 'Indisponível']], i.status, `pim(${i.id},'status',this.value)`) : badge(i.status),
      i.views, `${esc(i.criador?.nome || '—')}<small>${i.criador?.role || ''}</small>`,
      `<a class="ev" href="/${i.slug}" target="_blank" title="Ver página"><i class="ri-external-link-line"></i></a>
       <button class="ev" title="Copiar link${ME.mkt ? ' (com o seu código)' : ''}" onclick="copiar('${linkImovel(i)}')"><i class="ri-links-line"></i></button>
       ${pode(i) ? `<button class="ev" title="Imagens (${i.imagens.length}/6)" onclick="imagens(${i.id})"><i class="ri-image-add-line"></i><sup>${i.imagens.length}</sup></button>` : ''}
       <button class="ev" title="Baixar ficha para assinatura" onclick="pdf(${i.id})"><i class="ri-file-pdf-2-line"></i></button>
       ${pode(i) ? `<button class="ev" title="Exclusividade" onclick="pim(${i.id},'exclusividade',${!i.exclusividade})"><i class="ri-star-${i.exclusividade ? 'fill' : 'line'}"></i></button>` : ''}`] })));
};

/* ───── leads ───── */
const TODOS = ['status', 'temperatura', 'corretor_id', 'valor_venda'];
const EDIT = { admin: TODOS, filial: TODOS, marketing: ['temperatura', 'corretor_id'], corretor: ['status', 'temperatura', 'valor_venda'] };
const pl = (id, k, val) => patch('leads', id, { [k]: val }).then(ir, ir);
PAGES.leads = async v => {
  v.innerHTML = SK;
  const [ls, us] = await Promise.all([call('/leads'), ROLE === 'corretor' ? [] : call('/usuarios')]);
  const cor = us.filter(u => u.role === 'corretor'), pode = k => EDIT[ROLE].includes(k);
  const lista = ls.filter(l => (!F.status || l.status === F.status) && (!F.temperatura || (F.temperatura === 'nq' ? !l.temperatura : l.temperatura === F.temperatura))
    && JSON.stringify([l.codigo, l.nome, l.telefone, l.email, l.imovel?.codigo]).toLowerCase().includes(F.q.toLowerCase()));
  v.innerHTML = `<div class="bar"><h3>Leads (${lista.length})</h3></div>
    <div class="filtros"><label class="f"><span>Pesquisar</span><input value="${esc(F.q)}" placeholder="Nome, telefone, código…" onchange="F.q=this.value;ir()"></label>
      <label class="f"><span>Estado</span>${sel([['', 'Todos'], ...Object.entries(ST)], F.status, 'F.status=this.value;ir()')}</label>
      <label class="f"><span>Temperatura</span>${sel([['', 'Todas'], ['nq', 'Não qualificados'], ['frio', 'Frio'], ['morno', 'Morno'], ['quente', 'Quente']], F.temperatura, 'F.temperatura=this.value;ir()')}</label></div>` +
    tabela(['Lead', 'Cliente', 'Imóvel', 'Temperatura', 'Corretor', 'Estado', 'Venda (MT)'], lista.map(l => {
      const im = l.imovel, indisp = im && im.status !== 'disponivel' && !['fechamento', 'pos-venda'].includes(l.status);
      const dica = !l.temperatura ? '<small class="warn">Por qualificar</small>' : !l.corretor_id ? `<small class="urg">${l.temperatura === 'quente' ? 'URGENTE: atribuir corretor' : 'Atribuir corretor'}</small>` : '';
      return { attr: indisp ? `class="vendido" title="O imóvel ${im.codigo} está ${im.status}. Contacte o cliente e proponha alternativas."` : '', cells: [
        `<b>${l.codigo}</b><small>${dt(l.createdAt)}${l.ref ? ' · ' + esc(l.ref) : ''}</small>`,
        `<b>${esc(l.nome)}</b><small><a href="tel:${esc(l.telefone)}">${esc(l.telefone)}</a> · <a target="_blank" href="https://wa.me/${String(l.telefone).replace(/\D/g, '')}"><i class="ri-whatsapp-line"></i></a></small><small>${esc([l.email, l.local].filter(Boolean).join(' · '))}</small>`,
        im ? `<a href="/${im.slug}" target="_blank"><b>${im.codigo}</b></a><small>${esc(TIPOS[im.tipo] || '')} · ${im.status}</small>` : '—',
        (pode('temperatura') ? sel(TEMP, l.temperatura, `pl(${l.id},'temperatura',this.value)`) : l.temperatura ? badge(l.temperatura) : badge('pendente', 'Não qualificado')) + dica,
        pode('corretor_id') ? sel([['', '— atribuir —'], ...cor.filter(c => c.parent_id === l.filial_id).map(c => [c.id, c.nome || c.email])], l.corretor_id, `pl(${l.id},'corretor_id',this.value)`) : esc(l.corretor?.nome || '—'),
        pode('status') ? sel(Object.entries(ST), l.status, `pl(${l.id},'status',this.value)`) : badge('', ST[l.status]),
        pode('valor_venda') ? `<input type="number" min="0" value="${l.valor_venda ?? ''}" placeholder="${im?.valor_venda ? +im.valor_venda : ''}" onchange="pl(${l.id},'valor_venda',this.value)">` : mt(l.valor_venda)] };
    }));
};

/* ───── comunicação e backup (admin) ───── */
PAGES.comunicar = v => {
  v.innerHTML = `<div class="box" style="max-width:640px"><h3 style="margin-bottom:1rem">Enviar alerta por email</h3><form class="form" id="fa">
    <label class="f"><span>Destinatários</span><select name="alvo"><option value="filiais">Todas as filiais</option><option value="todos">Toda a plataforma (filiais e equipas)</option></select></label>
    <label class="f"><span>Assunto</span><input name="titulo" required></label><label class="f"><span>Mensagem</span><textarea name="mensagem" rows="6" required></textarea></label>
    <button class="btn" type="submit"><i class="ri-send-plane-line"></i>Enviar</button></form></div>`;
  submit($('#fa'), async (d, f) => { const r = await call('/alerta', d); toast(`Mensagem enviada a ${r.enviados} utilizador(es)`); f.reset(); });
};
const backup = async tipo => {
  const d = await call('/backup'), nome = `celeca-backup-${new Date().toISOString().slice(0, 10)}`;
  if (tipo === 'json') baixar(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }), nome + '.json');
  else {
    const wb = XLSX.utils.book_new(), plano = r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, x && typeof x === 'object' ? JSON.stringify(x) : x]));
    ['usuarios', 'imoveis', 'leads'].forEach(k => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d[k].map(plano)), k));
    XLSX.writeFile(wb, nome + '.xlsx');
  }
  toast('Backup gerado');
};
PAGES.backup = v => {
  v.innerHTML = `<div class="box" style="max-width:560px"><h3>Backup geral da plataforma</h3><p class="sub" style="margin:.6rem 0 1.2rem;color:var(--cinza)">Utilizadores, imóveis e leads.</p>
    <div style="display:flex;gap:.8rem;flex-wrap:wrap"><button class="btn" onclick="backup('json')"><i class="ri-braces-line"></i>Descarregar JSON</button><button class="btn verde" onclick="backup('xlsx')"><i class="ri-file-excel-2-line"></i>Descarregar Excel</button></div></div>`;
};

/* ───── perfil e financeiro (menu do utilizador) ───── */
PAGES.perfil = v => {
  v.innerHTML = `<div class="box" style="max-width:520px"><h3 style="margin-bottom:1rem">O meu perfil</h3><form class="form" id="fp">
    <label class="f"><span>Email</span><input value="${esc(ME.email)}" disabled></label><label class="f"><span>Nome</span><input name="nome" value="${esc(ME.nome || '')}" required></label>
    <label class="f"><span>Telefone</span><input name="telefone" value="${esc(ME.telefone || '')}"></label><label class="f"><span>Nova senha (deixe vazio para manter)</span><input name="senha" type="password" minlength="6" autocomplete="new-password"></label>
    <button class="btn" type="submit">Guardar alterações</button></form></div>`;
  submit($('#fp'), async d => { await call('/me', d, 'PATCH'); ME = await call('/me'); toast('Perfil actualizado'); });
};
PAGES.financeiro = async v => {
  v.innerHTML = SK;
  const ls = (await call('/leads')).filter(l => ['fechamento', 'pos-venda'].includes(l.status)), total = ls.reduce((t, l) => t + (+l.valor_venda || 0), 0);
  v.innerHTML = `<div class="cards"><div class="stat"><i class="ri-trophy-line"></i><div><small>Vendas fechadas</small><b>${ls.length}</b></div></div><div class="stat"><i class="ri-money-dollar-circle-line"></i><div><small>Total faturado</small><b>${mt(total)}</b></div></div></div>` +
    tabela(['Lead', 'Cliente', 'Imóvel', 'Estado', 'Valor da venda'], ls.map(l => ({ cells: [l.codigo, esc(l.nome), l.imovel?.codigo || '—', ST[l.status], mt(l.valor_venda)] })));
};

iniciar();