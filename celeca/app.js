require('dotenv').config();
const path = require('path'), crypto = require('crypto');
const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { ready, Usuario, Imovel, Lead } = require('./db');

const SECRET = process.env.JWT_SECRET || 'troque-este-segredo';
const MAIL_URL = process.env.MAIL_URL || 'https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec';
const IMG_URL = process.env.IMG_URL || 'https://script.google.com/macros/s/AKfycbxpNRGKsVmJp4Yy6kNFVPa68buikeX903xUSpGHL9Qsaxm8BJ63KEY7-s0f9LiCR3GHsg/exec';
const PREFIXO = { lead: 'LD', imovel: 'I', mkt: 'MK' }; // prefixos dos códigos únicos (6 dígitos)
const app = express();

// ───────── utilitários reutilizáveis ─────────
const fail = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
const wrap = fn => (q, s) => Promise.resolve(fn(q, s)).catch(e => s.status(e.status || 500).json({ erro: e.message }));
const pub = f => (q, s) => s.sendFile(path.join(__dirname, 'public', f));
const pick = (o = {}, ks) => Object.fromEntries(ks.filter(k => k in o).map(k => [k, o[k] === '' ? null : o[k]]));
const norm = e => String(e || '').trim().toLowerCase();
const slugify = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const gen = async (M, campo, prefixo) => { for (;;) { const c = prefixo + String(crypto.randomInt(1e6)).padStart(6, '0'); if (!await M.findOne({ where: { [campo]: c } })) return c; } };
const origin = q => `${q.headers['x-forwarded-proto'] || q.protocol}://${q.headers['x-forwarded-host'] || q.get('host')}`;
const soma = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
const cnt = (a, f) => a.reduce((o, x) => (o[f(x)] = (o[f(x)] || 0) + 1, o), {});
const VENDA = ['fechamento', 'pos-venda'];
const texto = h => h.replace(/<br\s*\/?>|<\/p>/g, '\n').replace(/<[^>]+>/g, '').trim();
const mail = async (emails, title, html) => {
  try {
    const r = await fetch(MAIL_URL, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ email: [].concat(emails), title, message: texto(html), senderId: 'lojium empreendimentos' }),
    });
    const d = await r.json(); console.log('Email enviado, resposta:', d); return d;
  } catch (e) { console.error('Falha no email:', e.message); return { erro: e.message }; }
};

const upload = async b64 => {
  const p = new URLSearchParams({ image: b64, mimeType: 'image/jpeg', name: `${Date.now()}.jpg` });
  const r = await fetch(IMG_URL, { method: 'POST', body: p }).then(r => r.json());
  return r.url || r.data || '';
};

// convite / recuperação de senha: token de 24h → https://dominio/auth/:token/:userId
const convidar = async (q, u, assunto) => {
  await u.update({ token: crypto.randomBytes(24).toString('hex'), token_exp: new Date(Date.now() + 864e5) });
  const link = `${origin(q)}/auth/${u.token}/${u.id}`;
  return mail(u.email, assunto, `<p>Olá${u.nome ? ' ' + u.nome : ''}, defina o seu acesso à plataforma Celeca:</p><p><a href="${link}">${link}</a></p><p>O link é válido por 24 horas.</p>`);
};
const tokenUser = async ({ token, userId }) => {
  const u = await Usuario.findByPk(+userId) || fail('Link inválido', 410);
  if (!u.token || u.token !== token || u.token_exp < new Date()) fail('Link inválido ou expirado (24h). Peça um novo convite.', 410);
  return u;
};

// filial pausada/bloqueada bloqueia também toda a sua equipa
const bloqueado = async u => u.status !== 'ativo' || (u.parent_id && (await Usuario.findByPk(u.parent_id))?.status !== 'ativo');
const auth = (...roles) => async (q, s, next) => {
  try {
    const u = await Usuario.findByPk(jwt.verify((q.headers.authorization || '').slice(7), SECRET).id);
    if (!u) fail('Sessão inválida', 401);
    if (await bloqueado(u)) fail('Conta bloqueada ou suspensa. Contacte a direcção.', 403);
    if (roles.length && !roles.includes(u.role)) fail('Sem permissão', 403);
    q.u = u; next();
  } catch (e) { s.status(e.status || 401).json({ erro: e.status ? e.message : 'Sessão inválida' }); }
};

// escopos por perfil
const fid = u => u.role === 'filial' ? u.id : u.parent_id;
const escopoLeads = u => ({ admin: {}, filial: { filial_id: u.id }, marketing: { mkt_id: u.id }, corretor: { corretor_id: u.id } })[u.role];
const escopoImoveis = u => u.role === 'admin' ? {} : { filial_id: fid(u) };
const escopoUsers = u => ({ admin: { role: { [Op.ne]: 'admin' } }, filial: { parent_id: u.id }, marketing: { parent_id: u.parent_id, role: 'corretor' }, corretor: { id: u.id } })[u.role];
const SEM_SEGREDOS = { exclude: ['senha', 'token', 'token_exp'] };

// ───────── middlewares e páginas ─────────
app.use(express.json({ limit: '8mb' }));
//app.use((q, s, n) => ready.then(() => n(), () => s.status(500).json({ erro: 'Base de dados indisponível' })));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/', pub('public.html'));
app.get(['/authentication', '/auth/:token/:userId'], pub('public.html'));
app.get('/dashboard', pub('dashboard.html'));

// ───────── autenticação ─────────
app.post('/api/login', wrap(async (q, s) => {
  const email = norm(q.body.email), senha = String(q.body.senha || '');
  let u = await Usuario.findOne({ where: { email } });
  const primeiro = !u && !await Usuario.count() && (!process.env.ADMIN_EMAIL || norm(process.env.ADMIN_EMAIL) === email);
  if (primeiro) u = await Usuario.create({ email, nome: 'Direcção Geral', role: 'admin', status: 'ativo', senha: await bcrypt.hash(senha, 10) }); // 1º utilizador = super admin
  if (!u?.senha || !await bcrypt.compare(senha, u.senha)) fail('Email ou senha inválidos', 401);
  if (await bloqueado(u)) fail('Conta bloqueada ou suspensa. Contacte a direcção.', 403);
  s.json({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' }), role: u.role, nome: u.nome });
}));
app.post('/api/esqueci', wrap(async (q, s) => {
  const u = await Usuario.findOne({ where: { email: norm(q.body.email) } });
  if (u) await convidar(q, u, 'Recuperação de senha');
  s.json({ ok: true });
}));
app.get('/api/convite/:token/:userId', wrap(async (q, s) => {
  const u = await tokenUser(q.params), p = u.parent_id && await Usuario.findByPk(u.parent_id);
  s.json({ email: u.email, nome: u.nome, role: u.role, filial: p?.nome || u.nome });
}));
app.post('/api/convite/:token/:userId', wrap(async (q, s) => {
  const u = await tokenUser(q.params), { nome, senha } = q.body;
  if (String(senha || '').length < 6) fail('A senha deve ter pelo menos 6 caracteres');
  await u.update({ nome: nome || u.nome, senha: await bcrypt.hash(senha, 10), status: u.status === 'pendente' ? 'ativo' : u.status, token: null, token_exp: null });
  s.json({ email: u.email });
}));
app.get('/api/me', auth(), wrap(async (q, s) => s.json(await Usuario.findByPk(q.u.id, { attributes: SEM_SEGREDOS }))));
app.patch('/api/me', auth(), wrap(async (q, s) => {
  const b = pick(q.body, ['nome', 'telefone']);
  if (q.body.senha) q.body.senha.length < 6 ? fail('A senha deve ter pelo menos 6 caracteres') : b.senha = await bcrypt.hash(q.body.senha, 10);
  await q.u.update(b); s.json({ ok: true });
}));

// ───────── utilizadores (filiais / equipa) ─────────
const PODE_CRIAR = { admin: ['filial'], filial: ['marketing', 'corretor'] };
app.get('/api/usuarios', auth(), wrap(async (q, s) => s.json(await Usuario.findAll({ where: escopoUsers(q.u), attributes: SEM_SEGREDOS, order: [['id', 'DESC']] }))));
app.post('/api/usuarios', auth('admin', 'filial'), wrap(async (q, s) => {
  const email = norm(q.body.email), role = q.body.role || 'filial', pai = q.u.role === 'filial' ? q.u.id : null;
  if (!email || !PODE_CRIAR[q.u.role].includes(role)) fail('Email ou perfil inválido');
  let u = await Usuario.findOne({ where: { email } });
  if (u && !(u.status === 'pendente' && u.role === role && (u.parent_id || null) === pai)) fail('Este email já está registado');
  u ||= await Usuario.create({ ...pick(q.body, ['nome', 'provincia', 'telefone', 'cargo']), email, role, parent_id: pai, mkt: role === 'marketing' ? await gen(Usuario, 'mkt', PREFIXO.mkt) : null });
  const r = await convidar(q, u, role === 'filial' ? `Convite para a ${u.nome || 'filial'} - Celeca` : 'Convite para a equipa Celeca');
  s.json({ id: u.id, email: r, link: `${origin(q)}/auth/${u.token}/${u.id}` });
}));

const meuUser = async q => await Usuario.findOne({ where: { id: q.params.id, ...escopoUsers(q.u) } }) || fail('Utilizador não encontrado', 404);
app.post('/api/usuarios/:id/reenviar', auth('admin', 'filial'), wrap(async (q, s) => s.json(await convidar(q, await meuUser(q), 'Defina a sua senha - Celeca'))));
app.patch('/api/usuarios/:id', auth('admin', 'filial'), wrap(async (q, s) => {
  const u = await meuUser(q);
  await u.update(pick(q.body, ['status', 'nome', 'provincia', 'telefone', 'cargo'])); s.json({ ok: true });
}));

// ───────── imóveis: público ─────────
const PUBLICO = ['codigo', 'slug', 'titulo', 'descricao', 'tipo', 'destino', 'bairro', 'cidade', 'detalhes', 'area_construida', 'area_total', 'terreno', 'valor_venda', 'exclusividade', 'imagens', 'views', 'status'];
app.get('/api/imoveis', wrap(async (q, s) => {
  const { tipo, q: busca } = q.query, like = { [Op.iLike]: `%${busca}%` };
  const where = { status: 'disponivel', ...(tipo && { tipo }), ...(busca && { [Op.or]: ['titulo', 'bairro', 'cidade', 'endereco', 'codigo'].map(c => ({ [c]: like })) }) };
  s.json(await Imovel.findAll({ where, attributes: PUBLICO, order: [['createdAt', 'DESC']] }));
}));
app.get('/api/imoveis/:slug', wrap(async (q, s) => {
  const im = await Imovel.findOne({ where: { slug: q.params.slug }, attributes: [...PUBLICO, 'id'] }) || fail('Imóvel não encontrado', 404);
  await im.increment('views'); s.json(im);
}));
app.post('/api/leads', wrap(async (q, s) => {
  const im = await Imovel.findOne({ where: { slug: q.body.slug } }) || fail('Imóvel não encontrado', 404);
  if (im.status !== 'disponivel') fail('Este imóvel já não está disponível');
  if (!q.body.nome || !q.body.telefone) fail('Preencha o nome e o telefone');
  const m = q.body.mkt && await Usuario.findOne({ where: { mkt: q.body.mkt, role: 'marketing' } });
  const l = await Lead.create({ ...pick(q.body, ['nome', 'email', 'telefone', 'local', 'obs']), codigo: await gen(Lead, 'codigo', PREFIXO.lead), imovel_id: im.id, ref: m?.mkt || null, mkt_id: m?.id || null, filial_id: m?.parent_id || im.filial_id });
  s.json({ codigo: l.codigo, whatsapp: process.env.WHATSAPP || '258841014142' });
}));

// ───────── imóveis: painel ─────────
const CAMPOS = ['descricao', 'prop_nome', 'prop_bi', 'prop_nuit', 'prop_naturalidade', 'prop_endereco', 'prop_bairro', 'prop_cidade', 'prop_telefone', 'prop_email', 'destino', 'tipo', 'endereco', 'bairro', 'cidade', 'detalhes', 'outros', 'area_construida', 'area_total', 'terreno', 'placa', 'jornal', 'valor_avaliacao', 'valor_avaliacao_extenso', 'valor_venda', 'valor_venda_extenso', 'comissao_pct', 'comissao_valor', 'comissao_extenso', 'exclusividade'];
const podeEditar = (u, im) => u.role === 'admin' || im.filial_id === fid(u) && (u.role === 'filial' || im.criador_id === u.id);
const meuImovel = async q => {
  const im = await Imovel.findOne({ where: { id: q.params.id, ...escopoImoveis(q.u) } });
  return im && podeEditar(q.u, im) ? im : fail('Imóvel não encontrado ou sem permissão', 404);
};
app.get('/api/painel/imoveis', auth(), wrap(async (q, s) => s.json(await Imovel.findAll({ where: escopoImoveis(q.u), include: [{ model: Usuario, as: 'criador', attributes: ['nome', 'role'] }], order: [['id', 'DESC']] }))));
app.post('/api/painel/imoveis', auth('filial', 'marketing', 'corretor'), wrap(async (q, s) => {
  const b = pick(q.body, CAMPOS), codigo = await gen(Imovel, 'codigo', PREFIXO.imovel);
  const titulo = `${TIPOS[b.tipo] || 'Imóvel'} em ${b.bairro || b.cidade || 'Nampula'}`;
  s.json(await Imovel.create({ ...b, titulo, codigo, slug: `${slugify(titulo)}-${codigo.toLowerCase()}`, criador_id: q.u.id, filial_id: fid(q.u) }));
}));
const TIPOS = { casa: 'Casa', flat: 'Flat', terreno: 'Terreno', comercial: 'Espaço comercial', chacara: 'Chácara', armazem: 'Armazém' };
app.patch('/api/painel/imoveis/:id', auth(), wrap(async (q, s) => s.json(await (await meuImovel(q)).update(pick(q.body, [...CAMPOS, 'status'])))));
app.post('/api/painel/imoveis/:id/imagem', auth(), wrap(async (q, s) => {
  const im = await meuImovel(q);
  if (im.imagens.length >= 6) fail('Máximo de 6 imagens por imóvel');
  const url = await upload(String(q.body.image || '').replace(/^data:.*?,/, '')) || fail('Falha ao enviar a imagem', 502);
  s.json(await im.update({ imagens: [...im.imagens, url] }));
}));
app.delete('/api/painel/imoveis/:id/imagem/:i', auth(), wrap(async (q, s) => {
  const im = await meuImovel(q); s.json(await im.update({ imagens: im.imagens.filter((_, k) => k !== +q.params.i) }));
}));

// ───────── leads ─────────
const TODOS = ['status', 'temperatura', 'corretor_id', 'valor_venda', 'obs_interna'];
const PERMITIDOS = { admin: TODOS, filial: TODOS, marketing: ['temperatura', 'corretor_id', 'obs_interna'], corretor: ['status', 'temperatura', 'valor_venda', 'obs_interna'] };
app.get('/api/leads', auth(), wrap(async (q, s) => s.json(await Lead.findAll({
  where: escopoLeads(q.u), 
  order: [['id', 'DESC']],
  include: [
    {  model: Imovel,  as: 'imovel',  attributes: ['id', 'codigo', 'titulo', 'slug', 'status', 'valor_venda', 'tipo'], required: false }, 
    {   model: Usuario,  as: 'corretor',  attributes: ['id', 'nome'], required: false }
  ],
}))));

app.patch('/api/leads/:id', auth(), wrap(async (q, s) => {
  const l = await Lead.findOne({ where: { id: q.params.id, ...escopoLeads(q.u) } }) || fail('Lead não encontrado', 404);
  const b = pick(q.body, PERMITIDOS[q.u.role]);
  if (b.corretor_id) {
    const c = await Usuario.findOne({ where: { id: b.corretor_id, role: 'corretor', parent_id: l.filial_id } }) || fail('Corretor inválido');
    if (!(b.temperatura ?? l.temperatura)) fail('Qualifique o lead (temperatura) antes de o atribuir');
    if (l.status === 'lead') b.status = 'atendimento';
    mail(c.email, 'Novo lead atribuído', `<p>Lead <b>${l.codigo}</b> — ${l.nome} (${l.telefone}). Temperatura: <b>${b.temperatura ?? l.temperatura}</b>.</p><p>Abra o seu painel para atender.</p>`);
  }
  if (b.status === 'fechamento' && !(b.valor_venda ?? l.valor_venda)) b.valor_venda = (await Imovel.findByPk(l.imovel_id))?.valor_venda;
  s.json(await l.update(b));
}));

// ───────── estatísticas, backup e comunicação ─────────
app.get('/api/stats', auth(), wrap(async (q, s) => {
  const [ls, ims, us] = await Promise.all([
    Lead.findAll({ where: escopoLeads(q.u), raw: true }),
    Imovel.findAll({ where: escopoImoveis(q.u), attributes: ['status', 'filial_id', 'criador_id', 'views'], raw: true }),
    Usuario.findAll({ where: escopoUsers(q.u), attributes: ['id', 'nome', 'email', 'role', 'status', 'provincia'], raw: true }),
  ]);
  const vendas = ls.filter(l => VENDA.includes(l.status)), adm = q.u.role === 'admin';
  const dono = (m, l) => adm ? l.filial_id === m.id : (m.role === 'marketing' ? l.mkt_id : l.corretor_id) === m.id;
  const ranking = ['admin', 'filial'].includes(q.u.role) ? us.filter(m => !adm || m.role === 'filial').map(m => {
    const meus = ls.filter(l => dono(m, l)), v = meus.filter(l => VENDA.includes(l.status));
    return { nome: m.nome || m.email, role: m.role, status: m.status, leads: meus.length, vendas: v.length, valor: soma(v, l => l.valor_venda), imoveis: ims.filter(i => adm ? i.filial_id === m.id : i.criador_id === m.id).length };
  }).sort((a, b) => b.valor - a.valor) : [];
  const porMes = vendas.reduce((o, l) => { const k = new Date(l.updatedAt).toISOString().slice(0, 7); o[k] = (o[k] || 0) + (+l.valor_venda || 0); return o; }, {});
  s.json({ totalLeads: ls.length, totalImoveis: ims.length, views: soma(ims, i => i.views), leadsStatus: cnt(ls, l => l.status), imoveisStatus: cnt(ims, i => i.status), vendas: { qtd: vendas.length, valor: soma(vendas, l => l.valor_venda) }, ranking, porMes });
}));
app.get('/api/backup', auth('admin'), wrap(async (q, s) => s.json({ gerado: new Date(), usuarios: await Usuario.findAll({ attributes: SEM_SEGREDOS }), imoveis: await Imovel.findAll(), leads: await Lead.findAll() })));
app.post('/api/alerta', auth('admin'), wrap(async (q, s) => {
  const { titulo, mensagem, alvo } = q.body, us = await Usuario.findAll({ where: { role: alvo === 'filiais' ? 'filial' : { [Op.ne]: 'admin' }, status: { [Op.ne]: 'pendente' } } });
  if (!titulo || !mensagem || !us.length) fail('Preencha o assunto e a mensagem (e verifique se há destinatários)');
  s.json({ enviados: us.length, resposta: await mail(us.map(u => u.email), titulo, `<p>${String(mensagem).replace(/\n/g, '<br>')}</p>`) });
}));


app.use('/api', (q, s) => s.status(404).json({ erro: 'Rota não encontrada' }));
app.get('/:slug([a-z0-9-]+)/:mkt?', pub('public.html'));

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 1000, () => console.log('Celeca a correr na porta', process.env.PORT || 1000));