const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
let pend = 0;

// fetch à API com token, barra de progresso e erros padronizados
const api = async (url, body, method) => {
  document.body.classList.toggle('busy', ++pend > 0);
  try {
    const t = localStorage.celeca_token;
    const r = await fetch('/api' + url, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: body && JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.erro || 'Erro inesperado'), { status: r.status });
    return d;
  } finally { document.body.classList.toggle('busy', --pend > 0); }
};

const toast = (m, tipo = 'ok') => { const e = Object.assign(document.createElement('div'), { className: 'toast ' + tipo, textContent: m }); $('#toast').append(e); setTimeout(() => e.remove(), 3800); };
// formulário com loader no botão + tratamento de erro
const submit = (f, fn) => f.addEventListener('submit', async e => {
  e.preventDefault(); const b = $('button[type=submit]', f); b.classList.add('loading');
  try { await fn(Object.fromEntries(new FormData(f)), f); } catch (x) { x.mostrado || toast(x.message, 'err'); }
  b.classList.remove('loading');
});

const mt = v => v == null || v === '' ? '—' : new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v) + ' MT';
const dt = d => new Date(d).toLocaleDateString('pt-PT');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TIPOS = { casa: 'Casa', flat: 'Flat', terreno: 'Terreno', comercial: 'Comercial', chacara: 'Chácara/Campo', armazem: 'Armazém' };
const DESTINOS = { venda: 'Venda', aluguer: 'Aluguer', troca: 'Troca' };
const ST = { lead: 'Lead (novo)', atendimento: 'Atendimento', visita: 'Visita', proposta: 'Proposta', fechamento: 'Fechamento', 'pos-venda': 'Pós-venda', concorrencia: 'Concorrência', desistiu: 'Desistiu' };
const DET = {
  quartos: ['Quartos', 'ri-hotel-bed-line'], suites: ['Suítes', 'ri-door-open-line'], sala: ['Sala', 'ri-sofa-line'], sala_intima: ['Sala íntima', 'ri-armchair-line'],
  sala_lareira: ['Sala c/ lareira', 'ri-fire-line'], sala_estar: ['Sala de estar', 'ri-tv-2-line'], copa: ['Copa', 'ri-cup-line'], cozinha: ['Cozinha', 'ri-restaurant-line'],
  dep_empregada: ['Dep. empregada', 'ri-user-3-line'], wc_empregada: ['WC empregada', 'ri-drop-line'], lavabo: ['Lavabo', 'ri-drop-line'], wc_total: ['WC total', 'ri-water-flash-line'],
  piscina: ['Piscina', 'ri-water-percent-line'], terraco: ['Terraço', 'ri-sun-line'], patio: ['Pátio', 'ri-plant-line'], lavandaria: ['Lavandaria', 'ri-t-shirt-line'],
  garagem: ['Garagem', 'ri-car-line'], churrasqueira: ['Churrasqueira', 'ri-fire-line'],
};
const AREAS = { area_construida: ['Área construída', 'ri-ruler-2-line'], area_total: ['Área total', 'ri-artboard-line'], terreno: ['Terreno', 'ri-landscape-line'] };
const chip = (i, t, l) => `<span class="chip" title="${l}"><i class="${i}"></i>${t}</span>`;
// ícones de detalhes (opcionais: só aparecem se preenchidos)
const chips = im => [
  ...Object.entries(DET).filter(([k]) => im.detalhes?.[k] > 0).map(([k, [l, i]]) => chip(i, `${im.detalhes[k]} ${l}`, l)),
  ...Object.entries(AREAS).filter(([k]) => im[k] > 0).map(([k, [l, i]]) => chip(i, `${+im[k]} m²`, l)),
].join('');