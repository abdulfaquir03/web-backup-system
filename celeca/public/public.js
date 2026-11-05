const [p1, p2, p3] = location.pathname.split('/').filter(Boolean);
const rota = !p1 ? 'home' : p1 === 'authentication' ? 'auth' : p1 === 'auth' && p3 ? 'convite' : 'imovel';
// código de marketing: /:slug/:mkt ou /?mkt=… (fica guardado para os links seguintes)
const mkt = new URLSearchParams(location.search).get('mkt') || (rota === 'imovel' && p2) || localStorage.celeca_mkt || '';
if (mkt) localStorage.celeca_mkt = mkt;
const home = '/' + (mkt ? '?mkt=' + mkt : '');

const show = id => { $$('main > section').forEach(s => s.hidden = s.id !== id); $('#hd').classList.toggle('solid', id !== 'home' || scrollY > 40); };
const safe = fn => (...a) => fn(...a).catch(e => toast(e.message, 'err'));
$$('.lnk-home').forEach(a => a.href = home);
$$('.lnk-lista').forEach(a => a.href = home + '#imoveis');
$('#ano').textContent = new Date().getFullYear();
addEventListener('scroll', () => $('#hd').classList.toggle('solid', rota !== 'home' || scrollY > 40));

/* ───── HOME ───── */
const card = im => `<a class="card" href="/${im.slug}${mkt ? '/' + mkt : ''}">
  <div class="img" style="${im.imagens[0] ? `background-image:url('${esc(im.imagens[0])}')` : ''}">${im.imagens[0] ? '' : '<i class="ri-home-5-line"></i>'}
    <span class="tag">${(im.destino || []).map(d => DESTINOS[d]).join(' · ') || TIPOS[im.tipo] || 'Imóvel'}</span></div>
  <h3>${esc(im.titulo)}</h3>
  <p class="loc"><i class="ri-map-pin-2-line"></i> ${esc([im.bairro, im.cidade].filter(Boolean).join(', '))}</p>
  <div class="chips">${chips(im)}</div><div class="preco">${mt(im.valor_venda)}</div></a>`;
const skel = n => '<div class="card sk-card"><div class="img sk"></div><div class="sk l1"></div><div class="sk l2"></div><div class="sk l3"></div></div>'.repeat(n);

const listar = safe(async () => {
  $('#lista').innerHTML = skel(6);
  const l = await api('/imoveis?' + new URLSearchParams({ tipo: $('#f-tipo').value, q: $('#f-q').value.trim() }));
  $('#lista').innerHTML = l.map(card).join('') || '<p class="vazio">Nenhum imóvel encontrado para esta pesquisa.</p>';
});
const iniciarHome = () => {
  show('home'); listar();
  $('#form-filtro').onsubmit = e => { e.preventDefault(); listar(); $('#imoveis').scrollIntoView(); };
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .2 });
  $$('.reveal').forEach(el => io.observe(el));
};

/* ───── AUTENTICAÇÃO ───── */
const iniciarAuth = () => {
  show('auth');
  const f = $('#form-login'), email = sessionStorage.celeca_email;
  if (email) { f.email.value = email; sessionStorage.removeItem('celeca_email'); f.senha.focus(); }
};
submit($('#form-login'), async d => {
  const r = await api('/login', d);
  localStorage.celeca_token = r.token; localStorage.celeca_role = r.role;
  location.href = '/dashboard';
});
$('#esqueci').onclick = e => { e.preventDefault(); $('#form-esqueci').hidden = false; $('#form-esqueci input').focus(); };
submit($('#form-esqueci'), async d => { await api('/esqueci', d); $('#esqueci-msg').hidden = false; });

/* ───── CONVITE (definir nome e senha) ───── */
const iniciarConvite = safe(async () => {
  show('convite');
  try {
    const d = await api(`/convite/${p2}/${p3}`), f = $('#form-convite');
    f.email.value = d.email; f.nome.value = d.nome || '';
    $('#conv-info').textContent = d.role === 'filial' ? `Preencha as informações para aceder à ${d.filial}.` : `Preencha as informações para fazer parte da filial ${d.filial}.`;
    f.hidden = false;
  } catch (e) { $('#conv-info').innerHTML = `<b style="color:#c0392b">${esc(e.message)}</b>`; }
});
submit($('#form-convite'), async d => {
  const r = await api(`/convite/${p2}/${p3}`, { nome: d.nome, senha: d.senha });
  sessionStorage.celeca_email = r.email;
  history.replaceState(null, '', '/authentication'); // remove token e id da URL
  toast('Acesso definido! Faça login para continuar.'); iniciarAuth();
});

/* ───── DETALHE DO IMÓVEL ───── */
const detalhe = im => {
  const ok = im.status === 'disponivel', imgs = im.imagens.length ? im.imagens : [''];
  return `<div class="det">
  <div class="car"><div class="track">${imgs.map(u => `<div style="${u ? `background-image:url('${esc(u)}')` : ''}">${u ? '' : '<i class="ri-home-5-line"></i>'}</div>`).join('')}</div>
    ${imgs.length > 1 ? '<button class="prev" aria-label="Anterior"><i class="ri-arrow-left-s-line"></i></button><button class="next" aria-label="Seguinte"><i class="ri-arrow-right-s-line"></i></button>' : ''}
    <div class="dots">${imgs.length > 1 ? imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('') : ''}</div></div>
  <div class="info">
    ${ok ? '' : `<div class="banner"><i class="ri-error-warning-line"></i>${im.status === 'vendido' ? 'Este imóvel já foi vendido.' : 'Este imóvel está indisponível.'}</div>`}
    <span class="chip" style="align-self:flex-start">${im.codigo}${im.exclusividade ? ' · Exclusivo' : ''}</span>
    <h1>${esc(im.titulo)}</h1>
    <p class="loc"><i class="ri-map-pin-2-line"></i> ${esc([im.bairro, im.cidade].filter(Boolean).join(', '))} · ${(im.destino || []).map(d => DESTINOS[d]).join(' / ')}</p>
    <div class="preco">${mt(im.valor_venda)}</div>
    <div class="chips">${chips(im)}</div>
    <p class="loc"><i class="ri-eye-line"></i> ${im.views} visualizações</p>
    ${ok ? '<button class="btn cta" id="btn-interesse"><i class="ri-heart-3-line"></i>Tenho interesse neste imóvel</button>'
      : `<a class="btn cta" href="${home}"><i class="ri-arrow-left-line"></i>Voltar à página inicial</a>`}
    ${ok ? `<div id="lead-box"><div>
      <form id="form-lead">
        <label class="f"><span>Nome</span><input name="nome" required></label>
        <label class="f"><span>Email</span><input name="email" type="email" required></label>
        <label class="f"><span>Telefone</span><input name="telefone" type="tel" required></label>
        <label class="f"><span>Local onde vive</span><input name="local" required></label>
        <label class="f full"><span>Observações (opcional)</span><textarea name="obs" rows="3"></textarea></label>
        <button class="btn verde full" type="submit">Registar interesse</button>
      </form></div></div>` : ''}
    <div id="sucesso" class="sucesso" hidden></div>
  </div>
  ${im.descricao ? `<div class="desc"><h3>Descrição</h3><p>${esc(im.descricao)}</p></div>` : ''}</div>`;
};
const carrossel = () => {
  const t = $('.track'), pts = $$('.dots i');
  if (!pts.length) return;
  const go = d => t.scrollBy({ left: d * t.clientWidth, behavior: 'smooth' });
  $('.prev').onclick = () => go(-1);
  $('.next').onclick = () => go(1);
  t.onscroll = () => { const i = Math.round(t.scrollLeft / t.clientWidth); pts.forEach((p, k) => p.classList.toggle('on', k === i)); };
  setInterval(() => t.scrollLeft + t.clientWidth >= t.scrollWidth - 5 ? t.scrollTo({ left: 0, behavior: 'smooth' }) : go(1), 5000);
};
const iniciarImovel = async () => {
  show('imovel');
  const box = $('#imovel');
  box.innerHTML = '<div class="det"><div class="car sk"></div><div class="info"><div class="sk" style="height:24px"></div><div class="sk" style="height:18px;width:60%"></div><div class="sk" style="height:60px"></div></div></div>';
  let im;
  try { im = await api('/imoveis/' + p1); } catch (e) {
    box.innerHTML = `<div class="box" style="margin:2rem auto"><h2>Imóvel não encontrado</h2><p class="sub">O link pode estar incorrecto ou o imóvel foi removido.</p><br><a class="btn" href="${home}">Voltar à página inicial</a></div>`; return;
  }
  document.title = im.titulo + ' · Celeca Imobiliária';
  box.innerHTML = detalhe(im); carrossel();
  if (im.status !== 'disponivel') return;
  $('#btn-interesse').onclick = () => { $('#lead-box').classList.add('open'); setTimeout(() => $('#lead-box').scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); };
  submit($('#form-lead'), async d => {
    const r = await api('/leads', { ...d, slug: im.slug, mkt });
    $('#btn-interesse').hidden = true; $('#lead-box').hidden = true;
    const msg = encodeURIComponent(`Olá! Registei interesse no imóvel ${im.codigo} (${im.titulo}). O meu código é ${r.codigo}.`);
    $('#sucesso').innerHTML = `<i class="ri-checkbox-circle-fill"></i><h3>O seu interesse foi registado com sucesso!</h3><p>Código do pedido: <b>${r.codigo}</b></p>
      <a class="btn verde cta" target="_blank" rel="noopener" href="https://wa.me/${r.whatsapp}?text=${msg}"><i class="ri-whatsapp-line"></i>Continuar a conversa no WhatsApp</a>`;
    $('#sucesso').hidden = false; $('#sucesso').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

({ home: iniciarHome, auth: iniciarAuth, convite: iniciarConvite, imovel: iniciarImovel })[rota]();