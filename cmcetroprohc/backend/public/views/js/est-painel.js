let isNavigating = false;

function navigate(targetPageId) {
    if (isNavigating) return; isNavigating = true;
    const loader = document.getElementById('top-loader');
    loader.style.transition = 'none';
    loader.style.width = '0%';
    void loader.offsetWidth;
    loader.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
    loader.style.width = '100%';
    document.querySelectorAll('[data-target]').forEach(el => {
        if (el.getAttribute('data-target') === targetPageId) {
            el.classList.add('active');
        } else {el.classList.remove('active');}
    });
    setTimeout(() => {
        document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');
        const targetPage = document.getElementById(`page-${targetPageId}`);
        if (targetPage) targetPage.style.display = 'block';
        isNavigating = false;
    }, 500);
}


async function buscarPerfilAluno() {
  try {const res = await fetch('/api/cm/dados/alunos/perfil', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json(); return res.ok && data.status ? (data.perfil || data.alunos) : null;
  } catch (error) {console.error('Erro ao buscar perfil:', error); return null;}
}

async function buscarCursosAluno() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/cm/dados/cursos-aluno', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok ? await res.json() : [];
  } catch (e) { return []; }
}

async function buscarMinhasInscricoes() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
    const res = await fetch('/api/cm/dados/aluno/inscricoes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err) { console.error("Erro ao buscar inscrições:", err); return null; }
}

async function buscarMinhasTurmasEInscricoes() {
  const res = await fetch('/api/cm/dados/aluno/minhas-turmas-inscricoes', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  return await res.json();
}


function toggleLoader(action) {
  const old = document.getElementById('global-loader');
  if (action === 'stop') return old?.remove();
  if (action === 'loader' && !old) {
    const el = document.createElement('div');
    el.id = 'global-loader';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(200,200,200,0.3);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:99999';
    el.innerHTML = '<div style="width:40px;height:40px;border:4px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 0.8s linear infinite"></div>';
    if (!document.getElementById('spin-style')) document.head.insertAdjacentHTML('beforeend', '<style id="spin-style">@keyframes spin{to{transform:rotate(360deg)}}</style>');
    document.body.appendChild(el);
  }
}



async function verificarAlertasAluno() {
  const aluno = await buscarPerfilAluno();
  const container = document.getElementById('alertas-container');
  if (!container || !aluno) return;

  let html = '';
  const p = aluno.perfil_json || {};

  if (!aluno.email_verificado) {
    html += `
      <div class="card-alerta">
        <div class="card-alerta-info">
          <i class="ri-mail-unread-line"></i>
          <div class="card-alerta-texto">
            <h4>E-mail não verificado</h4>
            <p>Verifique o e-mail para liberar inscrições e outras funções.</p>
          </div>
        </div>
        <button class="btn-alerta" onclick="this.innerHTML='A enviar...'; reenviarVerificacaoEmail()">Verificar E-mail</button>
      </div>`;
  }

  const camposObrigatorios = [
    aluno.nome, aluno.data_nascimento, aluno.celular,
    p.nome_pai, p.nome_mae, p.doc_numero, p.doc_emissao, p.doc_validade,
    p.nuit, p.provincia, p.distrito, p.bairro, p.rua, p.encarregado_nome, p.encarregado_telefone
  ];

  const perfilIncompleto = camposObrigatorios.some(val => !val || String(val).trim() === '');

  if (perfilIncompleto) {
    html += `
      <div class="card-alerta">
        <div class="card-alerta-info">
          <i class="ri-user-settings-line"></i>
          <div class="card-alerta-texto">
            <h4>Perfil incompleto</h4>
            <p>Preencha todos os dados obrigatórios para enviar seu perfil para análise.</p>
          </div>
        </div>
        <button class="btn-alerta" onclick="navigate('perfil')">Completar Agora</button>
      </div>`;
  } else {
    const statusVerificacao = p.verificacao?.status || 'em_analise';

    if (statusVerificacao === 'em_analise' || statusVerificacao === 'pendente') {
      html += `
        <div class="card-alerta" style="border-left: 4px solid #f59e0b;">
          <div class="card-alerta-info">
            <i class="ri-time-line" style="color: #f59e0b;"></i>
            <div class="card-alerta-texto">
              <h4>Perfil em análise</h4>
              <p>Os seus dados foram enviados e estão aguardando validação da secretaria.</p>
            </div>
          </div>
        </div>`;
    } else if (statusVerificacao === 'rejeitado') {
      html += `
        <div class="card-alerta" style="border-left: 4px solid #ef4444; background-color: #fef2f2;">
          <div class="card-alerta-info">
            <i class="ri-error-warning-line" style="color: #ef4444;"></i>
            <div class="card-alerta-texto">
              <h4 style="color: #991b1b;">Verificação Rejeitada</h4>
              <p style="color: #991b1b;">Seus dados foram invalidados pela secretaria. Atualize o perfil com dados e documentos reais.</p>
            </div>
          </div>
          <button class="btn-alerta" style="background-color: #ef4444; color: #fff;" onclick="navigate('perfil')">Atualizar Dados</button>
        </div>`;
    }
  }
  container.innerHTML = html;
}



function renderizarCardVerificacao() {
  if (document.getElementById('modal-verificacao-email')) return;
  const div = document.createElement('div');
  div.id = 'modal-verificacao-email';
  div.className = 'modal-overlay';
  div.innerHTML = `<div class="card-codigo-verificacao"><h3>VERIFICAR EMAIL</h3><p>Insira o código de 6 dígitos enviado para a sua caixa de entrada.</p><input type="text" id="ipt-codigo-2fa" maxlength="6" placeholder="000000"><button id="btn-validar-codigo" onclick="processarValidacaoCodigo()">Confirmar Código</button> <br><br> <center><p onclick="reenviarVerificacaoEmail()">Reenviar o email</p></center></div>`;
  document.body.appendChild(div);
}

function checarModalPendente() {
  if (localStorage.getItem('aguardando_codigo_email') === 'true') renderizarCardVerificacao();
}

async function reenviarVerificacaoEmail(btn) {
  if (btn) btn.innerHTML = 'Enviando...';
  try {
    const res = await fetch('/api/cm/dados/alunos/reenviar-verificacao', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    if (res.ok && data.status) {
      localStorage.setItem('aguardando_codigo_email', 'true');
      renderizarCardVerificacao();
    } else { alert(data.mensagem || 'Erro ao enviar e-mail.'); }
  } catch (e) { alert('Erro de conexão ao enviar e-mail.'); }
  finally { if (btn) btn.innerHTML = 'Verificar E-mail'; }
}

async function processarValidacaoCodigo() {
  const input = document.getElementById('ipt-codigo-2fa');
  const btn = document.getElementById('btn-validar-codigo');
  const codigo = input?.value.trim();
  if (!codigo || codigo.length < 6) return alert('Digite o código de 6 dígitos.');
  btn.innerHTML = 'Validando...';
  btn.disabled = true;
  await validarCodigoConfirmacao(codigo);
}

async function validarCodigoConfirmacao(codigo) {
  try { const res = await fetch('/api/cm/dados/alunos/validar-codigo', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ codigo })
    }); const data = await res.json(); if (res.ok && data.status) {
      localStorage.removeItem('aguardando_codigo_email'); alert(data.mensagem); location.reload();
    } else { alert(data.mensagem || 'Verifique a sua caixa de entrada.');
      const btn = document.getElementById('btn-validar-codigo');
      if (btn) { btn.innerHTML = 'Confirmar Código'; btn.disabled = false; }
    }
  } catch (error) { alert('Erro ao conectar com o servidor.'); const btn = document.getElementById('btn-validar-codigo');
    if (btn) { btn.innerHTML = 'Confirmar Código'; btn.disabled = false; }
  }
}







let alunoAtualMemoria = null;

const trocarAbaPerfil = idx => {
  document.querySelectorAll('.pf-tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  document.querySelectorAll('.pf-grupo-form').forEach((f, i) => f.classList.toggle('active', i === idx));
};

const gerarIniciais = n => !n ? '--' : n.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const fileToBase64 = f => new Promise(r => { if (!f) return r(null); const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });

const getVal = id => document.getElementById(id)?.value?.trim() || '';

async function carregarEPreencherPerfil() {
  const a = await buscarPerfilAluno();
  if (!a) return;
  alunoAtualMemoria = a;
  const p = a.perfil_json || {};
  document.getElementById('pf-header-nome').innerText = a.nome || '---';
  document.getElementById('pf-header-email').innerText = a.email || '---';
  const imgPrev = document.getElementById('pf-img-preview'), initBox = document.getElementById('pf-avatar-iniciais');
  if (a.foto_url) {imgPrev.crossOrigin = 'anonymous'; imgPrev.referrerPolicy = 'no-referrer'; imgPrev.src = a.foto_url; imgPrev.style.display = 'block'; initBox.style.display = 'none';
  } else {initBox.innerText = gerarIniciais(a.nome); initBox.style.display = 'block'; imgPrev.style.display = 'none';}

  const campos = {
    'pf-nome': a.nome, 'pf-genero': a.genero || 'M', 'pf-data-nasc': a.data_nascimento, 'pf-celular': a.celular,
    'pf-nome-pai': p.nome_pai, 'pf-nome-mae': p.nome_mae, 'pf-estado-civil': p.estado_civil, 'pf-whatsapp': p.whatsapp,
    'pf-encarregado-nome': p.encarregado_nome, 'pf-encarregado-telefone': p.encarregado_telefone,
    'pf-doc-tipo': p.doc_tipo, 'pf-doc-numero': p.doc_numero, 'pf-doc-emissao': p.doc_emissao, 'pf-doc-validade': p.doc_validade,
    'pf-doc-local': p.doc_local, 'pf-nuit': p.nuit, 'pf-nacionalidade': p.nacionalidade || 'Moçambicana',
    'pf-provincia': p.provincia, 'pf-distrito': p.distrito, 'pf-posto-admin': p.posto_admin, 'pf-bairro': p.bairro,
    'pf-rua': p.rua, 'pf-casa-numero': p.casa_numero, 'pf-escolaridade': p.escolaridade, 'pf-escola-anterior': p.escola_anterior, 'pf-ano-conclusao': p.ano_conclusao
  };
  Object.entries(campos).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val || ''; });
}

async function salvarGrupo0() {
  const pA = alunoAtualMemoria?.perfil_json || {};
  const payload = {
    nome: getVal('pf-nome'), genero: getVal('pf-genero'), data_nascimento: getVal('pf-data-nasc'), celular: getVal('pf-celular'),
    perfil_json: { ...pA, nome_pai: getVal('pf-nome-pai'), nome_mae: getVal('pf-nome-mae'), estado_civil: getVal('pf-estado-civil'), whatsapp: getVal('pf-whatsapp'), encarregado_nome: getVal('pf-encarregado-nome'), encarregado_telefone: getVal('pf-encarregado-telefone') }
  };
  await enviarAtualizacaoPerfil(payload);
}

async function salvarGrupo1() {
  const pA = alunoAtualMemoria?.perfil_json || {};
  const foto = await fileToBase64(document.getElementById('pf-foto-input')?.files[0]);
  const docF = await fileToBase64(document.getElementById('pf-doc-frente')?.files[0]);
  const docV = await fileToBase64(document.getElementById('pf-doc-verso')?.files[0]);
  const payload = {
    ...(foto && { foto_url: foto }),
    perfil_json: { ...pA, doc_tipo: getVal('pf-doc-tipo'), doc_numero: getVal('pf-doc-numero'), doc_emissao: getVal('pf-doc-emissao'), doc_validade: getVal('pf-doc-validade'), doc_local: getVal('pf-doc-local'), nuit: getVal('pf-nuit'), nacionalidade: getVal('pf-nacionalidade'), doc_frente: docF || pA.doc_frente || null, doc_verso: docV || pA.doc_verso || null }
  };
  await enviarAtualizacaoPerfil(payload);
}

async function salvarGrupo2() {
  const pA = alunoAtualMemoria?.perfil_json || {};
  const cert = await fileToBase64(document.getElementById('pf-certificado-file')?.files[0]);
  const payload = {
    perfil_json: { ...pA, provincia: getVal('pf-provincia'), distrito: getVal('pf-distrito'), posto_admin: getVal('pf-posto-admin'), bairro: getVal('pf-bairro'), rua: getVal('pf-rua'), casa_numero: getVal('pf-casa-numero'), escolaridade: getVal('pf-escolaridade'), escola_anterior: getVal('pf-escola-anterior'), ano_conclusao: getVal('pf-ano-conclusao'), certificado_doc: cert || pA.certificado_doc || null }
  };
  await enviarAtualizacaoPerfil(payload);
}

async function enviarAtualizacaoPerfil(payload) {
  try {toggleLoader("loader")
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    
    const res = await fetch('/api/cm/dados/perfil', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });
    toggleLoader("stop")
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar perfil.');

    alert('Perfil salvo com sucesso!'); 
    location.reload();
  } catch (err) {toggleLoader("stop")
    alert(err.message || 'Erro ao conectar ao servidor.');
    console.log(err)
  }
}




const DEFAULT_IMG = "https://i.ibb.co/TBhjTtj3/62475d85-cb2a-415d-a285-b5053eb4a5ef.jpg";
let listaCursosCache = [];

function formatarUrlImagem(url) {
  if (!url) return DEFAULT_IMG;
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}=s800?authuser=0`;
  }
  return url;
}

// Carrega e renderiza os cards de cursos
async function carregarSecaoExplorar() {
  const container = document.getElementById('cursos-grid');
  try {
    const cursos = await buscarCursosAluno();
    listaCursosCache = Array.isArray(cursos) ? cursos : [];

    if (listaCursosCache.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 40px 20px; background:#fff; border-radius:12px; border:1px dashed #CBD5E1;">
          <i class="ri-folder-unknow-line" style="font-size: 32px; color: #94A3B8;"></i>
          <p style="color:#64748B; font-weight:600; margin: 8px 0;">Nenhum curso disponível no momento.</p>
          <button onclick="carregarSecaoExplorar()" style="background:var(--cm-blue-mid); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">
            <i class="ri-refresh-line"></i> Tentar Novamente
          </button>
        </div>`;
      return;
    }

    container.innerHTML = listaCursosCache.map(c => `
      <div class="curso-card" onclick="abrirModalCurso(${c.id})">
        <img class="curso-thumb" src="${formatarUrlImagem(c.imagem)}" crossorigin="anonymous" onerror="this.src='${DEFAULT_IMG}'" alt="${c.nome}">
        <div class="curso-body">
          <div>
            <span class="curso-area"><i class="ri-bookmark-3-line"></i> ${c.area || 'Geral'}</span>
            <h3 class="curso-title">${c.nome}</h3>
            <p class="curso-desc">${c.descricao || 'Sem descrição.'}</p>
          </div>
          <div class="curso-meta">
            <span><i class="ri-time-line"></i> ${c.carga_horaria || 0}h</span>
            <span><i class="ri-money-dollar-circle-line"></i> ${c.preco ? c.preco + ' MZN' : 'Gratuito'}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p style="grid-column: 1/-1; color:red; text-align:center;"><i class="ri-error-warning-line"></i> Erro ao ligar ao servidor.</p>`;
  }
}

function abrirModalCurso(id) {
  const curso = listaCursosCache.find(c => c.id === id);
  if (!curso) return;

  const dados = curso.dados_json || {};
  const html = `
    <img class="modal-img" src="${formatarUrlImagem(curso.imagem)}" crossorigin="anonymous" onerror="this.src='${DEFAULT_IMG}'">
    <span class="curso-area"><i class="ri-bookmark-3-line"></i> ${curso.area || 'Geral'}</span>
    <h2 style="margin: 4px 0 8px; color:#0A192F;">${curso.nome}</h2>
    <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">${curso.descricao || ''}</p>
    
    <div class="modal-info-grid">
      <div><i class="ri-time-line"></i> <strong>Duração:</strong> ${curso.carga_horaria || 0} Horas</div>
      <div><i class="ri-slideshow-3-line"></i> <strong>Modalidade:</strong> ${dados.modalidade || 'Não especificada'}</div>
      <div><i class="ri-price-tag-3-line"></i> <strong>Preço:</strong> ${curso.preco ? curso.preco + ' MZN' : 'Grátis'}</div>
      <div><i class="ri-calendar-event-line"></i> <strong>Prestações:</strong> ${curso.num_prestacoes || 1}x</div>
      <div><i class="ri-file-edit-line"></i> <strong>Taxa Inscrição:</strong> ${curso.taxa_inscricao || 0} MZN</div>
      <div><i class="ri-award-line"></i> <strong>Taxa Certificado:</strong> ${curso.taxa_certificado || 0} MZN</div>
      <div style="grid-column: 1/-1;"><i class="ri-graduation-cap-line"></i> <strong>Escolaridade exigida:</strong> ${dados.nivel_escolaridade || 'Sem restrição'}</div>
    </div>

    ${dados.requisitos ? `<div style="margin-bottom:16px; font-size:12px;"><i class="ri-checkbox-circle-line"></i> <strong>Requisitos:</strong> ${Array.isArray(dados.requisitos) ? dados.requisitos.join(', ') : dados.requisitos}</div>` : ''}

    <button class="btn-inscrever" onclick="inscreverCurso(${curso.id})">
      <i class="ri-user-add-line"></i> Fazer Inscrição
    </button>
  `;

  document.getElementById('modal-curso-conteudo').innerHTML = html;
  document.getElementById('modal-curso').style.display = 'flex';
}


function fecharModalCurso() {
  document.getElementById('modal-curso').style.display = 'none';
}


async function inscreverCurso(cursoId) {
  toggleLoader("loader");
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/cm/dados/inscricao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ curso_id: cursoId })
    });
    const data = await res.json();
    if (!res.ok) return alert(`Atenção: ${data.detalhe ? `${data.error}\n${data.detalhe}` : (data.error || 'Erro ao realizar inscrição.')}`);
    
    alert(data.message || 'Inscrição realizada com sucesso!');
    location.reload();
  } catch (err) {
    alert("Erro de conexão com o servidor.");
  } finally {
    toggleLoader("stop");
  }
}



let listaInscricoesGlobal = [], inscricaoAtiva = null;

function notificarProblemaInscricao(problemas) {
  const c = document.getElementById('alertas-container');
  if (!c || !problemas || !problemas.length) return;
  c.querySelectorAll('.card-alerta-inscricao').forEach(e => e.remove());

  // Filtra apenas inscrições que realmente tenham taxa de inscrição pendente ou rejeitada no JSON
  const unicos = Array.from(new Map(
    problemas
      .filter(p => {
        const json = p.inscricao?.inscricao_json || {};
        const taxaValor = parseFloat(p.inscricao?.valor_actual?.taxa_inscricao || 0);
        return taxaValor > 0 && (!json.status || json.status === 'PENDENTE' || json.status === 'REJEITADO');
      })
      .map(p => [p.inscricao.id, p])
  ).values());

  if (!unicos.length) return;

  const temRejeitado = unicos.some(p => p.inscricao?.inscricao_json?.status === 'REJEITADO');
  const corBorda = temRejeitado ? '#dc2626' : '#f59e0b';
  const iconeAlerta = temRejeitado ? 'ri-error-warning-line' : 'ri-wallet-3-line';

  const msg = unicos.length === 1 
    ? `Sua inscrição <strong>#${unicos[0].inscricao.codigo_inscricao}</strong> possui taxa pendente ou requer reenvio de comprovativo.` 
    : `Você tem pagamentos de inscrição pendentes em <strong>${unicos.length} cursos</strong>.`;

  const card = document.createElement('div');
  card.className = 'card-alerta card-alerta-inscricao';
  card.style.cssText = `border-left: 4px solid ${corBorda}; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; border-left-width: 4px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);`;
  
  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <i class="${iconeAlerta}" style="font-size: 1.5rem; color: ${corBorda};"></i>
      <div>
        <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: #0f172a;">Pagamento de Inscrição Pendente</h4>
        <p style="margin: 0; font-size: 0.85rem; color: #475569;">${msg}</p>
      </div>
    </div>
    <button class="btn-alerta" style="background: ${corBorda}; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 4px;" onclick="navigate('financeiro')">
      <i class="ri-arrow-right-line"></i> Resolver Agora
    </button>
  `;
  c.appendChild(card);
}



function verificarInscricoesIncompletas(inscricoes) {
  if (!Array.isArray(inscricoes)) return;
  const pendencias = inscricoes.filter(i => {
    const val = i.valor_actual || {};
    const taxa = parseFloat(val.taxa_inscricao || 0);
    const paga = val.inscricao && val.inscricao.paga === true;
    return taxa > 0 && (!paga || i.status === 'PENDENTE' || i.status_pagamento === 'PENDENTE');
  }).map(i => ({ inscricao: i, motivo: 'Taxa pendente' }));

  if (pendencias.length) notificarProblemaInscricao(pendencias);
}

function renderizarGridInscricoes(inscricoes) {
  const container = document.getElementById('gridInscricoes');
  if (!container) return;
  if (!inscricoes?.length) return container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#64748b;"><i class="ri-folder-info-line"></i> Nenhuma inscrição encontrada.</p>';
  
  container.innerHTML = inscricoes.map(i => {
    const inscJson = i.inscricao_json || {};
    const statusTaxaInsc = inscJson.status || (inscJson.paga ? 'PAGO' : 'PENDENTE');
    
    return `
      <div class="card-inscricao" onclick="abrirModalFinanceiro(${i.id})" style="cursor:pointer; background:#fff; padding:16px; border-radius:12px; border:1px solid #e2e8f0; transition:0.2s;">
        <div class="card-head" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="card-code" style="font-weight:700; color:#0f172a;"><i class="ri-file-user-line" style="color:#2563eb;"></i> #${i.codigo_inscricao}</span>
          <span class="badge badge-${i.status}">${i.status}</span>
        </div>
        <p style="font-size:0.85rem; color:#64748b; margin:6px 0;"><i class="ri-calendar-line"></i> Data: ${new Date(i.createdAt).toLocaleDateString()}</p>
        <div style="margin-top:0.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
          <span style="color:#475569;"><i class="ri-file-text-line"></i> Taxa Inscrição:</span>
          <span class="badge badge-${statusTaxaInsc}">${statusTaxaInsc}</span>
        </div>
        <div style="margin-top:0.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
          <span style="color:#475569;"><i class="ri-bank-card-line"></i> Pagamento:</span>
          <span class="badge badge-${i.status_pagamento}">${i.status_pagamento}</span>
        </div>
      </div>`;
  }).join('');
}

async function inicializarPainelInscricoes() {
  listaInscricoesGlobal = await buscarMinhasInscricoes();
  verificarInscricoesIncompletas(listaInscricoesGlobal);
  renderizarGridInscricoes(listaInscricoesGlobal);
}

function abrirModalFinanceiro(inscricaoId) {
  inscricaoAtiva = listaInscricoesGlobal.find(i => i.id === inscricaoId);
  console.log(listaInscricoesGlobal);
  if (!inscricaoAtiva) return;
  const modal = document.getElementById('modalFinanceiro');
  if (!modal) return;

  document.getElementById('modalCodigo').innerText = `Inscrição #${inscricaoAtiva.codigo_inscricao}`;
  const badge = document.getElementById('modalStatusBadge');
  badge.innerText = inscricaoAtiva.status;
  badge.className = `badge badge-${inscricaoAtiva.status}`;

  const val = inscricaoAtiva.valor_actual || {};
  document.getElementById('mPreco').innerText = `${val.preco_curso || '0.00'} MT`;
  document.getElementById('mTaxa').innerText = `${val.taxa_inscricao || '0.00'} MT`;
  document.getElementById('mCert').innerText = `${val.taxa_certificado || '0.00'} MT`;

  const lista = document.getElementById('listaPrestacoes');
  lista.innerHTML = (inscricaoAtiva.mensalidades_json || []).map(m => `
    <div class="prestacao-item">
      <span>Prestação ${m.n_prestacao} - <strong>${m.valor} MT</strong></span>
      <span class="badge badge-${m.status}">${m.status}</span>
    </div>
  `).join('');

  const taxaInscricao = parseFloat(val.taxa_inscricao || 0);
  const inscJson = inscricaoAtiva.inscricao_json || {};
  const inscricaoPagaOuEmVerificacao = inscJson.paga === true || inscJson.status === 'APROVADO' || inscJson.status === 'EM_VERIFICACAO';
  
  const mensalidades = inscricaoAtiva.mensalidades_json || [];
  const proximaPrestacao = mensalidades.find(m => m.status !== 'PAGO' && m.status !== 'APROVADO');
  const certPago = inscricaoAtiva.certificado_json?.taxa_paga === true;

  let msgPrioridade = '';
  if (taxaInscricao > 0 && !inscricaoPagaOuEmVerificacao) {
    msgPrioridade = `A sua prioridade actual é o pagamento da <strong>Taxa de Inscrição (${taxaInscricao.toFixed(2)} MT)</strong>.${inscJson.status === 'REJEITADO' ? ' <span style="color:#dc2626;">(O comprovativo anterior foi rejeitado, envie um novo).</span>' : ''}`;
  } else if (inscJson.status === 'EM_VERIFICACAO') {
    msgPrioridade = `A sua <strong>Taxa de Inscrição</strong> foi submetida e está atualmente <strong>em verificação</strong> pelo operador financeiro.`;
  } else if (proximaPrestacao) {
    msgPrioridade = `O comprovativo que submeter será associado à <strong>Prestação ${proximaPrestacao.n_prestacao} (${parseFloat(proximaPrestacao.valor).toFixed(2)} MT)</strong>.`;
  } else if (!certPago && parseFloat(val.taxa_certificado || 0) > 0) {
    msgPrioridade = `Todas as prestações estão pagas! Falta apenas regularizar a <strong>Taxa de Certificado (${parseFloat(val.taxa_certificado).toFixed(2)} MT)</strong>.`;
  } else {
    msgPrioridade = `Todas as obrigações financeiras deste curso estão <strong>completas</strong>.`;
  }

  const elUrgencia = document.getElementById('listaUrgencia');
  if (elUrgencia) {
    elUrgencia.innerHTML = `
      <div style="background:#fffbe0; margin-top:10px; border-left:4px solid #eab308; padding:20px; border-radius:30px; margin-bottom:12px; font-size:0.83rem; color:#713f12;">
        <div style="font-weight:900; margin-bottom:2px; display:flex; align-items:center; gap:6px;">
          <span>PRÓXIMO PASSO DE PAGAMENTO:</span>
        </div>
        <p style="margin:0 0 6px 0;">${msgPrioridade}</p>
        <small style="color:#a16207; display:block; line-height:1.2;"><i class="ri-error-warning-line"></i> <strong>Atenção:</strong> Anexe apenas imagens nítidas do comprovativo bancário/móvel real.</small>
      </div>`;
  }

  document.getElementById('contasGrid').innerHTML = '';
  modal.style.display = 'flex';
}




function fecharModalFinanceiro() {
  const modal = document.getElementById('modalFinanceiro');
  if (modal) modal.style.display = 'none';
  inscricaoAtiva = null;
}


async function carregarContasPagamento() {
  const sk = document.getElementById('contasSkeleton'), g = document.getElementById('contasGrid');
  if (sk) sk.style.display = 'block'; if (g) g.innerHTML = '';
  try {
    const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
    const cursoId = inscricaoAtiva?.curso_id || '';
    const r = await fetch(`/api/cm/dados/contas-pagamento`, { headers: { 'Authorization': `Bearer ${t}` } });
    const contas = r.ok ? await r.json() : [];
    if (sk) sk.style.display = 'none';
    const selId = localStorage.getItem('conta_pagamento_id');

    g.innerHTML = contas.map(c => `
      <div class="conta-card ${selId == c.id ? 'selecionada' : ''}" id="conta-card-${c.id}" onclick="selecionarConta(${c.id}, '${c.tipo}', '${c.titular}', '${c.numero}')">
        <input type="radio" name="conta_sel" ${selId == c.id ? 'checked' : ''}>
        <div><strong>${c.tipo}</strong> - ${c.titular}<br><small>Número: <strong>${c.numero}</strong></small></div>
      </div>`).join('') || '<p style="font-size:0.8rem;">Nenhuma conta encontrada.</p>';

    const cSel = contas.find(c => c.id == selId);
    if (cSel) document.getElementById('feedbackConta')?.remove(), g.insertAdjacentHTML('afterend', `<p id="feedbackConta" style="font-size:0.85rem;color:#16a34a;margin-top:6px;">Você escolheu pagar com <strong>${cSel.tipo}</strong> (${cSel.titular})</p>`);
  } catch (e) { if (sk) sk.style.display = 'none'; if (g) g.innerHTML = '<p style="color:#ef4444;font-size:0.8rem;">Erro ao carregar contas.</p>'; }
}

function selecionarConta(id, tipo, titular, numero) {
  localStorage.setItem('conta_pagamento_id', id);
  navigator.clipboard.writeText(numero);
  document.querySelectorAll('.conta-card').forEach(el => el.classList.remove('selecionada'));
  document.getElementById(`conta-card-${id}`)?.classList.add('selecionada');
  document.querySelectorAll('input[name="conta_sel"]').forEach(r => r.checked = false);
  const radio = document.querySelector(`#conta-card-${id} input`); if (radio) radio.checked = true;
  document.getElementById('feedbackConta')?.remove();
  document.getElementById('contasGrid')?.insertAdjacentHTML('afterend', `<center><p id="feedbackConta" style="font-size:0.85rem;color:#16a34a;margin-top:6px; text-align: center">Você escolheu pagar com <strong>${tipo}</strong> (Titular: ${titular}) <br> Número copiado!</p></center>`);
}

async function submeterComprovativo() {
  const file = document.getElementById('inputComprovativo')?.files[0];
  if (!file || !inscricaoAtiva) return alert('Selecione uma imagem e uma inscrição.');
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      toggleLoader("loader");
      const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
      const r = await fetch('/api/cm/dados/aluno/comprovativo', { method: 'POST', headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inscricao_id: inscricaoAtiva.id, conta_id: localStorage.getItem('conta_pagamento_id'), comprovativo: reader.result }) });
      const data = await r.json(); toggleLoader("stop");
      if (!r.ok) throw new Error(data.error || 'Erro ao enviar.');
      reload(); alert('Comprovativo enviado com sucesso!'); fecharModalFinanceiro(); inicializarPainelInscricoes();
    } catch (e) { toggleLoader("stop"); alert(e.message); }
  };
  reader.readAsDataURL(file);
}



let estadoAlunoArea = { dados: null, turmaIdAtiva: null };

async function inicializarAreaMembrosAluno() {
  let respostaApi = await buscarMinhasTurmasEInscricoes()
    if (!respostaApi || !respostaApi.status) return;
    estadoAlunoArea.dados = respostaApi;

    const selectTurmas = document.getElementById('select-turma-aluno');
    if (!selectTurmas) return;

    selectTurmas.innerHTML = (respostaApi.turmas || []).map(function(t) {
        const curso = (respostaApi.cursos || []).find(function(c) { return c.id === t.curso_id; }) || {};
        return `<option value="${t.id}">${t.nome} - ${curso.nome || 'Curso'}</option>`;
    }).join('');

    if (respostaApi.turmas && respostaApi.turmas.length > 0) {
        selecionarTurmaAtiva(respostaApi.turmas[0].id);
    }
}

function selecionarTurmaAtiva(turmaId) {
    estadoAlunoArea.turmaIdAtiva = Number(turmaId);
    const turma = (estadoAlunoArea.dados.turmas || []).find(function(t) { return t.id === estadoAlunoArea.turmaIdAtiva; });
    const curso = (estadoAlunoArea.dados.cursos || []).find(function(c) { return c.id === (turma ? turma.curso_id : null); }) || {};
    const conteudo = (estadoAlunoArea.dados.conteudos || []).find(function(c) { return c.turma_id === estadoAlunoArea.turmaIdAtiva; }) || { modulos_json: [], aulas_json: [], avaliacoes_json: [], materiais_json: [] };

    const elNomeCurso = document.getElementById('nome-curso-ativo');
    if (elNomeCurso) {
        elNomeCurso.innerText = `${curso.nome || 'Curso'} (${turma ? turma.nome : ''})`;
    }

    renderizarModulosEAulas(conteudo);
    renderizarExercicios(conteudo.avaliacoes_json || []);
    renderizarMateriais(conteudo.materiais_json || []);
}

function renderizarModulosEAulas(conteudo) {
    const container = document.getElementById('lista-modulos-aulas');
    if (!container) return;

    const modulos = conteudo.modulos_json || [];
    const aulas = conteudo.aulas_json || [];

    if (modulos.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem; text-align: center;">Nenhum módulo disponibilizado para esta turma.</p>`;
        return;
    }

    container.innerHTML = modulos.map(function(m) {
        const aulasDoModulo = aulas.filter(function(a) { return Number(a.modulo_id) === Number(m.id); });
        
        const aulasHTML = aulasDoModulo.map(function(aula) {
            return `
                <div class="item-aula-clicavel" data-id="${aula.id}" style="padding: 10px 12px; border-radius: 14px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='transparent'">
                    <span style="color: #334155; font-weight: 600;"><i class="ri-play-circle-fill" style="color: #2563eb;"></i> ${aula.nome}</span>
                    <small style="color: #94a3b8;">${aula.duracao_min || 0} min</small>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 12px 16px; font-weight: 700; font-size: 0.85rem; color: #1e293b; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="ri-folder-3-line" style="color: #2563eb;"></i> ${m.nome}</span>
                    <small style="color: #64748b; font-weight: 400;">${aulasDoModulo.length} aula(s)</small>
                </div>
                <div style="padding: 8px;">
                    ${aulasHTML}
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.item-aula-clicavel').forEach(function(el) {
        el.addEventListener('click', function() {
            const idAula = Number(this.getAttribute('data-id'));
            const aula = aulas.find(function(a) { return Number(a.id) === idAula; });
            if (aula) {
                carregarVideoPlayer(aula.nome, aula.video_url || '', aula.descricao || '');
            }
        });
    });
}

function carregarVideoPlayer(titulo, videoUrl, descricao) {
    const elTitulo = document.getElementById('titulo-aula-ativa');
    const elDesc = document.getElementById('desc-aula-ativa');
    if (elTitulo) elTitulo.innerText = titulo;
    if (elDesc) elDesc.innerText = descricao || 'Sem descrição fornecida para esta aula.';

    const containerPlayer = document.getElementById('container-player-video');
    if (!containerPlayer) return;

    if (!videoUrl) {
        containerPlayer.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: #ef4444; font-size: 0.85rem;"><i class="ri-error-warning-line"></i> Link do vídeo indisponível para esta aula.</div>`;
        return;
    }

    let embedUrl = '';
    if (videoUrl.indexOf('youtube.com') !== -1 || videoUrl.indexOf('youtu.be') !== -1) {
        const id = videoUrl.indexOf('v=') !== -1 ? videoUrl.split('v=')[1].split('&')[0] : videoUrl.split('/').pop();
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (videoUrl.indexOf('drive.google.com') !== -1) {
        embedUrl = videoUrl.replace('/view', '/preview');
    } else {
        embedUrl = videoUrl;
    }

    containerPlayer.innerHTML = `<iframe src="${embedUrl}" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

function renderizarExercicios(exercicios) {
    const container = document.getElementById('lista-exercicios-container');
    if (!container) return;

    if (!exercicios || exercicios.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem;">Nenhum exercício registado para esta turma.</p>`;
        return;
    }

    container.innerHTML = exercicios.map(function(e) {
        return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <b style="color: #1e293b; font-size: 0.9rem; display: block;"><i class="ri-draft-line" style="color: #2563eb;"></i> ${e.titulo}</b>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #64748b;">${e.texto_perguntas || 'Consulte os detalhes para responder.'}</p>
                </div>
                <button type="button" class="btn-submeter-ex" data-titulo="${e.titulo}" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 30px; font-weight: 600; font-size: 0.75rem; cursor: pointer;">Submeter Resposta</button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-submeter-ex').forEach(function(btn) {
        btn.addEventListener('click', function() {
            alert('Submeter resposta para: ' + this.getAttribute('data-titulo'));
        });
    });
}

function renderizarMateriais(materiais) {
    const container = document.getElementById('lista-materiais-container');
    if (!container) return;

    if (!materiais || materiais.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem;">Nenhum material de apoio anexado nesta turma.</p>`;
        return;
    }

    container.innerHTML = materiais.map(function(m) {
        return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: #1e293b; font-weight: 600;"><i class="ri-file-pdf-line" style="color: #dc2626;"></i> ${m.nome}</span>
                <a href="${m.url || '#'}" target="_blank" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 30px; font-size: 0.75rem; font-weight: 600; text-decoration: none;">Download</a>
            </div>
        `;
    }).join('');
}

function trocarAbaAluno(nomeAba, el) {
    document.querySelectorAll('.conteudo-aba').forEach(function(div) { div.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.background = '#fff';
        btn.style.color = '#475569';
        btn.style.border = '1px solid #cbd5e1';
    });

    const abaAtiva = document.getElementById(`aba-${nomeAba}`);
    if (abaAtiva) abaAtiva.style.display = 'block';

    if (el) {
        el.style.background = '#2563eb';
        el.style.color = '#fff';
        el.style.border = 'none';
    }
}

// **************************************************************** */
function reload(){
  verificarAlertasAluno()
  checarModalPendente()
  inicializarAreaMembrosAluno()
  carregarEPreencherPerfil()
  carregarSecaoExplorar()
  inicializarPainelInscricoes()
}

reload()
