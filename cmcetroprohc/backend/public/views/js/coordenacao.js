
let isNavigating = false;

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function navigate(targetPageId, element) {
  if (isNavigating) return;
  isNavigating = true;
  const loader = document.getElementById('top-loader');
  loader.style.transition = 'none';
  loader.style.width = '0%';
  void loader.offsetWidth;
  loader.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
  loader.style.width = '100%'
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active')
  if (window.innerWidth <= 768) {
    toggleSidebar()
  }
  setTimeout(() => {
    document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');
    const targetPage = document.getElementById(`page-${targetPageId}`);
    if (targetPage) targetPage.style.display = 'block';
    isNavigating = false
  }, 1000)
}



async function buscarCoosG() {
  const res = await fetch('/api/cm/dados/coog/usuarios', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  const data = await res.json();
  return res.ok ? (data.dados || data.usuarios || data) : (alert(data.mensagem || 'Erro na sessão'), null);
}


async function buscarPainelCoordenador() {
  const res = await fetch('/api/cm/dados/coo/painel-geral', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  return (await res.json());
}


async function buscarTurmas() { try { const token = localStorage.getItem('token');
    const res = await fetch('/api/cm/dados/turmas', {method: 'GET', headers: {'Content-Type': 'application/json','Authorization': `Bearer ${token}`}});
    const data = await res.json(); if (!res.ok) { console.error('Erro na requisição de turmas:', data.mensagem);
      alert(data.mensagem || 'Acesso negado ou erro ao carregar turmas.'); return [];
  }return data.dados || []} catch (error) { console.error('Falha de conexão ao buscar turmas:', error);return []}
}

async function buscarCursos() {
  try {const res = await fetch('/api/cm/dados/cursos'); const data = await res.json();
    return (res.ok && data.status) ? data.dados : []; } catch (e) { return []; }
}



async function carregarEInjetarStatsCOO() {
  try {const [turmas, cursos] = await Promise.all([buscarTurmas(), buscarCursos()]);
    const turmasAtivas = turmas.filter(t => t.status === 'INSCRICOES_ABERTAS').length;
    const totalCursos = cursos.length;
    const cursosPendentes = cursos.filter(c => c.preco_status === 'PENDENTE' || c.preco === null).length;
    const totalAlunosInscritos = turmas.reduce((soma, t) => soma + (parseInt(t.vagas_preenchidas) || 0), 0);
    document.getElementById('coo-stat-turmas').innerText = turmasAtivas;
    document.getElementById('coo-stat-cursos').innerText = totalCursos;
    document.getElementById('coo-stat-pendentes').innerText = cursosPendentes;
    document.getElementById('coo-stat-alunos').innerText = totalAlunosInscritos.toLocaleString('pt-PT');
  } catch (error) {console.error('Erro ao carregar métricas da coordenação:', error)}
}


let cacheCoordenadores = [];
async function renderizarTabelaCoordenadores() {
  const tbody = document.getElementById('tbody-cooredenadores');
  if (!tbody) return; 
  const dados = await buscarCoosG();
  
  const token = localStorage.getItem('token');
  let minhaId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      minhaId = Number(payload.id || payload.userId || payload.usuarioId);
    } catch (e) { console.error('Erro ao decodificar o token'); }
  }
  cacheCoordenadores = (Array.isArray(dados) ? dados : []).filter(u => 
    (u.codigo || '').toUpperCase().trim() === 'FOR' && Number(u.ref) === minhaId
  )
  montarLinhasCoordenadores(cacheCoordenadores);
}


function montarLinhasCoordenadores(lista) { 
  const tbody = document.getElementById('tbody-cooredenadores'); if (!tbody) return; tbody.innerHTML = '';
  if (!lista || lista.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Nenhum formador encontrado.</td></tr>`; return; }
  lista.forEach(user => {
    tbody.innerHTML += `<tr><td><b>#${user.id}</b></td><td>${user.nome || 'N/A'}</td><td>${user.email || 'N/A'}</td><td><span style="background:#EFF6FF; color:#2563EB; padding:4px 10px; border-radius:8px; font-weight:600; font-size:0.8rem;">FORMADOR</span></td><td style="text-align:center;"><button class="btn-more-info" onclick="abrirDetalhesCoordenador(${user.id})" title="Ver Detalhes"><i class="ri-add-line"></i></button></td></tr>`;
  });
}



function filtrarTabelaUsuarios() {
  const input = document.getElementById('input-search-table'); if (!input) return;
  const termo = input.value.toLowerCase().trim();
  const filtrados = cacheCoordenadores.filter(u => (u.nome && u.nome.toLowerCase().includes(termo)) || (u.email && u.email.toLowerCase().includes(termo)))
  montarLinhasCoordenadores(filtrados);
}


function abrirDetalhesCoordenador(id) {
  const user = cacheCoordenadores.find(u => u.id === id); if (!user) return;
  const modalNome = document.getElementById('modal-nome-usuario');
  const modalConteudo = document.getElementById('modal-body-conteudo');
  const modalWrapper = document.getElementById('modal-usuario-detalhes');
  if (modalNome) modalNome.innerText = user.nome || 'Detalhes do Formador';
  if (modalConteudo) {
    modalConteudo.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #334155;">
        <p><b>Celular:</b> ${user.celular || 'N/A'}</p>
        <p><b>Gênero:</b> ${user.genero || 'N/A'}</p>
        <p><b>Status:</b> <span style="color: ${['activo', 'ativo'].includes(user.status) ? '#16A34A' : '#DC2626'}; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">${user.status || 'inativo'}</span></p>
        <p><b>Criado em:</b> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-PT') : 'N/A'}</p>
      </div><div id="container-extra-formador-${id}" style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        <div style="display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 0.9rem;">
          <i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> A carregar informações institucionais...
        </div>
      </div>
    `;
  }if (modalWrapper) modalWrapper.style.display = 'flex';
  if (typeof carregarDetalhesExtraFormador === 'function') {
    carregarDetalhesExtraFormador(id, `container-extra-formador-${id}`);
  }
}



async function carregarDetalhesExtraFormador(formadorId, containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  try {
    const res = await fetch(`/api/cm/dados/formadores/${formadorId}/detalhes`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    el.innerHTML = data.status ? `<p><b>Turmas Ativas:</b> ${data.turmas || 0}</p><p><b>Desempenho:</b> ${data.desempenho || 'Bom'}</p>` : '<p style="color:#dc2626;">Erro ao carregar extras.</p>';
  } catch { el.innerHTML = '<p style="color:#dc2626;">Erro de conexão.</p>'; }
}



function fecharModalDetalhes() {
  const modalWrapper = document.getElementById('modal-usuario-detalhes');
  if (modalWrapper) modalWrapper.style.display = 'none';
}







function abrirModalCriarTurma() {
  document.getElementById('form-criar-turma').reset();
  document.getElementById('modal-criar-turma').style.display = 'flex';
}
function fecharModalCriarTurma() {
  document.getElementById('modal-criar-turma').style.display = 'none';
}

async function salvarNovaTurma(event) {
  event.preventDefault()
  const payload = { nome: document.getElementById('turma-nome').value.trim(),
    modalidade: document.getElementById('turma-modalidade').value,
    vagas_totais: parseInt(document.getElementById('turma-vagas').value, 10),
    local_sala: document.getElementById('turma-local').value.trim(),
    data_inicio: document.getElementById('turma-data-inicio').value || null,
    data_fim: document.getElementById('turma-data-fim').value || null,
    horario: document.getElementById('turma-horario').value.trim(),
    status: document.getElementById('turma-status').value
  };
  if (!payload.nome || !payload.local_sala || !payload.horario) { alert('Por favor, preencha todos os campos obrigatórios.'); return}
  if (isNaN(payload.vagas_totais) || payload.vagas_totais < 1) {alert('O número de vagas totais deve ser no mínimo 1.'); return}
  if (payload.data_inicio && payload.data_fim && payload.data_inicio > payload.data_fim) { alert('A data de início não pode ser posterior à data de término.'); return}
  try {const response = await fetch('/api/cm/dados/coo/turmas', {method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}`}, body: JSON.stringify(payload)});
    const resultado = await response.json();
    if (response.ok && resultado.status) { alert('Turma cadastrada com sucesso!'); fecharModalCriarTurma(); reload()
      if (typeof renderizarTabelaTurmas === 'function') renderizarTabelaTurmas();
    } else {alert(resultado.mensagem || 'Erro ao cadastrar a turma.')}
  } catch (error) {
    console.error('Erro ao enviar dados da turma:', error);
    alert('Falha na conexão com o servidor.');
  }
}











let cacheListaTurmas = [];
let cacheListaCursos = [];
let modoAtual = 'TURMAS'; 
function alternarModoExibicao() {
  const btnToggle = document.getElementById('btn-toggle-view'); voltarParaLista();

  if (modoAtual === 'TURMAS') { modoAtual = 'CURSOS';
    btnToggle.innerHTML = '<i class="ri-slideshow-3-line"></i> Ver Turmas'; carregarERenderizarCursos();
  } else {modoAtual = 'TURMAS';btnToggle.innerHTML = '<i class="ri-book-read-line"></i> Ver Cursos'; carregarERenderizarTurmas();}
}

async function carregarERenderizarTurmas() {
  const container = document.getElementById('div-lista-turmas');
  if (!container) return; container.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1;">A carregar turmas...</p>';
  const [turmas, usuarios] = await Promise.all([buscarTurmas(), buscarCoosG()]);
  cacheListaTurmas = turmas; container.innerHTML = '';
  if (!turmas || turmas.length === 0) {container.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1;">Nenhuma turma encontrada.</p>';return;}

  const mapaUsuarios = {};
  if (Array.isArray(usuarios)) usuarios.forEach(u => mapaUsuarios[u.id] = u.nome);
  const temas = ['theme-blue', 'theme-green', 'theme-yellow', 'theme-purple'];
  const icones = ['ri-team-line', 'ri-group-line', 'ri-user-star-line', 'ri-contacts-book-line'];

  turmas.forEach((turma, i) => {const nomeCoord = mapaUsuarios[turma.coo_id] || 'Outra coordenação';
    const card = document.createElement('div'); card.className = 'turma-card';
    card.onclick = () => verDetalhesItem('TURMA', turma.id, nomeCoord);

    card.innerHTML = `
      <div class="turma-icon-badge ${temas[i % temas.length]}">
        <i class="${icones[i % icones.length]}"></i>
      </div>
      <div class="turma-info">
        <h4 class="turma-nome" title="${turma.nome}">${turma.nome}</h4>
        <p class="turma-meta"><b>Criada por:</b> ${nomeCoord}</p>
        <p class="turma-meta"><b>Formandos:</b> ${turma.vagas_preenchidas || 0} / ${turma.vagas_totais}</p>
      </div>
    `;
    container.appendChild(card);
  });
}


async function carregarERenderizarCursos() {
  const container = document.getElementById('div-lista-turmas');
  if (!container) return; container.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1;">A carregar cursos...</p>';
  const [cursos, usuarios] = await Promise.all([buscarCursos(), buscarCoosG()]);
  cacheListaCursos = cursos; container.innerHTML = '';if (!cursos || cursos.length === 0) {container.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1;">Nenhum curso encontrado.</p>';return;}
  const mapaUsuarios = {}; if (Array.isArray(usuarios)) usuarios.forEach(u => mapaUsuarios[u.id] = u.nome);
  const temas = ['theme-purple', 'theme-blue', 'theme-green', 'theme-yellow'];
  const icones = ['ri-book-open-line', 'ri-article-line', 'ri-bookmark-3-line', 'ri-award-line'];
  cursos.forEach((curso, i) => { const nomeCoord = mapaUsuarios[curso.coo_id] || 'Outra coordenação';
    const card = document.createElement('div');
    card.className = 'turma-card';
    card.onclick = () => verDetalhesItem('CURSO', curso.id, nomeCoord);
    card.innerHTML = `
      <div class="turma-icon-badge ${temas[i % temas.length]}">
        <i class="${icones[i % icones.length]}"></i>
      </div>
      <div class="turma-info">
        <h4 class="turma-nome" title="${curso.nome}">${curso.nome}</h4>
        <p class="turma-meta"><b>Área:</b> ${curso.area || 'Geral'}</p>
        <p class="turma-meta"><b>Carga:</b> ${curso.carga_horaria ? curso.carga_horaria + 'h' : 'N/A'} | <b>Criador:</b> ${nomeCoord}</p>
      </div>
    `;
    container.appendChild(card);
  });
}



async function verDetalhesItem(tipo, id, nomeCriador) {
  if (tipo !== 'TURMA') return;
  document.getElementById('div-lista-turmas').style.display = 'none';
  const divD = document.getElementById('div-detalhes-turma'), cont = document.getElementById('conteudo-detalhes-turma');
  const token = localStorage.getItem('token'); let meuId = null;
  try { meuId = Number(JSON.parse(atob(token.split('.')[1])).id); } catch(e){}
  const t = cacheListaTurmas.find(x => x.id === id); if (!t) return;
  const minhaCriacao = Number(t.coo_id) === meuId;
  document.getElementById('lbl-btn-voltar').innerText = 'Voltar às Turmas';
  
  cont.innerHTML = `
    <h2 style="color:#0f172a; margin-bottom:4px;">${t.nome}</h2>
    <p style="color:#64748b; font-size:0.9rem;"><b>Criador:</b> ${nomeCriador} ${minhaCriacao ? '(Sua Coordenação)' : '<span style="color:#dc2626; font-weight:600;">(Outra Coordenação)</span>'}</p>
    <div id="conteudo-dinamico-detalhes" style="margin-top:16px;">
      <div style="padding:20px; text-align:center; color:#2563eb;"><i class="ri-loader-4-line" style="animation:spin 1s linear infinite;"></i> A carregar dados completos da turma...</div>
    </div>
  `;
  divD.style.display = 'block';

  try {
    const [res, formadoresRes, cursosRes] = await Promise.all([
      fetch(`/api/cm/dados/turmas/${id}/detalhes-completos`, { headers: { 'Authorization': `Bearer ${token}` } }),
      typeof buscarCoosG === 'function' ? buscarCoosG() : Promise.resolve([]),
      typeof buscarCursos === 'function' ? buscarCursos() : Promise.resolve([])
    ]);
    const json = await res.json(); if (!json.status) throw new Error();
    const { turma, conteudo, inscricoes } = json;
    
    const formadoresCoop = (Array.isArray(formadoresRes) ? formadoresRes : (formadoresRes.dados || [])).filter(u => (u.codigo || '').toUpperCase() === 'FOR' && Number(u.ref) === meuId);
    const formadorAtualNome = turma.formador ? turma.formador.nome : 'Nenhum formador atribuído';
    const optionsFormadores = formadoresCoop.map(f => `<option value="${f.id}" ${turma.formador_id === f.id ? 'selected' : ''}>${f.nome} (${f.email})</option>`).join('');

    const todosCursos = Array.isArray(cursosRes) ? cursosRes : (cursosRes.dados || []);
    const meusCursosAtivos = todosCursos.filter(c => Number(c.coo_id) === meuId && ['activo', 'ativo'].includes((c.status || '').toLowerCase()));
    const cursoAtualObj = todosCursos.find(c => Number(c.id) === Number(turma.curso_id));
    const nomeCursoAtual = cursoAtualObj ? cursoAtualObj.nome : null;
    const optionsCursos = meusCursosAtivos.map(c => `<option value="${c.id}" ${Number(turma.curso_id) === Number(c.id) ? 'selected' : ''}>${c.nome}</option>`).join('');

    let renderModulos = '';
    (conteudo.modulos_json || []).forEach(m => {
      let aulasHtml = '';
      (conteudo.aulas_json || []).filter(a => a.modulo_id === m.id).forEach(a => {
        aulasHtml += `<li style="margin-bottom:4px;"><a href="${a.video_url || '#'}" target="_blank" style="color:#2563eb; text-decoration:none; font-weight:500;">${a.nome}</a> <span style="font-size:0.8rem; color:#64748b;">(${a.duracao_min || 0} min)</span></li>`;
      });
      renderModulos += `<div style="margin-bottom:12px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px;"><b style="color:#1e293b;">${m.nome}</b><ul style="max-height:150px; overflow-y:auto; padding-left:20px; margin:4px 0;">${aulasHtml || '<li style="color:#64748b; font-size:0.85rem;">Sem aulas.</li>'}</ul></div>`;
    });
    if (!renderModulos) renderModulos = '<p style="color:#64748b;">Nenhum módulo cadastrado.</p>';

    let renderMateriais = '';
    (conteudo.materiais_json || []).forEach(mat => {
      renderMateriais += `<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;"><span><i class="ri-file-text-line"></i> ${mat.nome}</span><a href="${mat.url || '#'}" target="_blank" style="color:#2563eb; text-decoration:none; font-weight:600; font-size:0.85rem;">Baixar</a></div>`;
    });
    if (!renderMateriais) renderMateriais = '<p style="color:#64748b; font-size:0.9rem;">Nenhum material de apoio.</p>';

    let renderInscritos = '';
    (inscricoes || []).forEach(i => {
      renderInscritos += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #e2e8f0; font-size:0.9rem;"><div><b>#${i.aluno?.id || i.aluno_id}</b> <span style="font-weight:600; color:#1e293b;">${i.aluno?.nome || 'Aluno'}</span><div style="font-size:0.8rem; color:#64748b;">${i.aluno?.email || ''}</div></div><div style="text-align:right;"><span style="background:#eff6ff; color:#2563eb; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">Progresso: ${i.desempenho_json?.progresso_porcentagem || 0}%</span><div style="font-size:0.8rem; color:#16a34a; margin-top:2px; font-weight:500;">Status: ${i.status}</div></div></div>`;
    });
    if (!renderInscritos) renderInscritos = '<p style="color:#64748b; font-size:0.9rem;">Nenhum aluno inscrito.</p>';

    document.getElementById('conteudo-dinamico-detalhes').innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; background:#f8fafc; padding:20px; border-radius:30px; margin-bottom:15px; border:1px solid #e2e8f0;">
        <p><b>Modalidade:</b> ${turma.modalidade}</p>
        <p><b>Curso:</b> ${nomeCursoAtual ? `<span style="color:#16a34a; font-weight:600;">${nomeCursoAtual}</span>` : '<span style="color:#dc2626; font-weight:600;">Nenhum curso atribuído</span>'}</p>
        <p><b>Formador:</b> <span style="color:#2563eb; font-weight:600;">${formadorAtualNome}</span></p>
        <p><b>Local/Sala:</b> ${turma.local_sala || 'N/A'}</p>
        <p><b>Horário:</b> ${turma.horario || 'N/A'}</p>
        <p><b>Vagas:</b> ${turma.vagas_preenchidas} / ${turma.vagas_totais}</p>
      </div>

      ${minhaCriacao ? `
        <!-- Gestão do Curso -->
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:15px;">
          <h3 style="font-size:1rem; margin-top:0; color:#1e293b;">Atribuição de Curso</h3>
          ${!turma.curso_id ? `<div style="background:#fef2f2; border:1px solid #fca5a5; color:#dc2626; padding:8px 12px; border-radius:6px; font-size:0.85rem; margin-bottom:10px; font-weight:600;">Atenção: Esta turma precisa de estar associada a um curso ativo!</div>` : ''}
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <select id="select-curso-turma-${id}" style="padding:8px; border-radius:6px; border:1px solid #cbd5e1; flex:1; min-width:220px;">
              <option value="">Selecione um curso ativo...</option>
              ${optionsCursos}
            </select>
            <button onclick="alterarCursoTurma(${id})" style="background:#16a34a; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:600;">Atribuir Curso</button>
          </div>
        </div>

        <!-- Gestão do Formador -->
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:15px;">
          <h3 style="font-size:1rem; margin-top:0; color:#1e293b;">Gestão do Formador</h3>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:8px;">
            <select id="select-novo-formador-${id}" style="padding:8px; border-radius:6px; border:1px solid #cbd5e1; flex:1; min-width:220px;">
              <option value="">Selecione um formador...</option>
              ${optionsFormadores}
            </select>
            <button onclick="alterarFormadorTurma(${id}, 'atribuir')" style="background:#2563eb; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:600;">Atribuir / Substituir</button>
            ${turma.formador_id ? `<button onclick="alterarFormadorTurma(${id}, 'remover')" style="background:#dc2626; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:600;">Remover</button>` : ''}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
            <h3 style="font-size:1rem; margin-top:0; color:#1e293b;">Módulos e Aulas</h3>
            <div style="max-height:220px; overflow-y:auto; padding-right:4px;">${renderModulos}</div>
          </div>
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
            <h3 style="font-size:1rem; margin-top:0; color:#1e293b;">Materiais Didáticos</h3>
            <div style="max-height:220px; overflow-y:auto; padding-right:4px;">${renderMateriais}</div>
          </div>
        </div>

        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
          <h3 style="font-size:1rem; margin-top:0; color:#1e293b;">Alunos Inscritos e Desempenho (${inscricoes.length})</h3>
          <div style="max-height:250px; overflow-y:auto;">${renderInscritos}</div>
        </div>
      ` : `
        <div style="background:#fef2f2; border:1px solid #fca5a5; padding:15px; border-radius:8px; text-align:center;">
          <p style="color:#dc2626; font-weight:600; margin:0;">Turma criada por outra coordenação. Conteúdos e gestão restritos.</p>
        </div>
      `}
    `;
  } catch (e) {
    document.getElementById('conteudo-dinamico-detalhes').innerHTML = `<p style="color:#dc2626; text-align:center;">Erro ao carregar dados detalhados.</p>`;
  }
}

async function alterarCursoTurma(turmaId) {
  const token = localStorage.getItem('token');
  const cursoId = document.getElementById(`select-curso-turma-${turmaId}`).value;
  if (!cursoId) return alert('Selecione um curso ativo válido.');
  try {
    const res = await fetch(`/api/cm/dados/turmas/${turmaId}/curso`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ curso_id: cursoId })
    });
    const data = await res.json();
    if (data.status) { alert('Curso atribuído com sucesso!'); location.reload(); }
    else { alert(data.mensagem || 'Erro ao atribuir curso.'); }
  } catch(err) { alert('Erro de conexão ao atribuir curso.'); }
}



async function alterarFormadorTurma(turmaId, acao) {
  const token = localStorage.getItem('token');
  const formadorId = acao === 'remover' ? null : document.getElementById(`select-novo-formador-${turmaId}`).value;
  if (acao === 'atribuir' && !formadorId) return alert('Selecione um formador válido.');
  try {
    const res = await fetch(`/api/cm/dados/turmas/${turmaId}/formador`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ formador_id: formadorId })
    });
    const data = await res.json();
    if (data.status) { alert('Formador atualizado com sucesso!'); location.reload(); }
    else { alert(data.mensagem || 'Erro ao atualizar formador.'); }
  } catch(err) { alert('Erro de conexão ao atualizar formador.'); }
}



function voltarParaLista() {
  document.getElementById('div-detalhes-turma').style.display = 'none';
  document.getElementById('div-lista-turmas').style.display = 'grid';
}






function abrirModalCurso() { document.getElementById('form-curso').reset(); document.getElementById('modal-curso').style.display = 'flex'; }
function fecharModalCurso() { document.getElementById('modal-curso').style.display = 'none'; }

async function salvarCurso(e) {e.preventDefault();
  const body = { nome: document.getElementById('c-nome').value.trim(),
    area: document.getElementById('c-area').value.trim() || null,
    carga_horaria: parseInt(document.getElementById('c-carga').value) || null,
    descricao: document.getElementById('c-desc').value.trim() || null,
    status: document.getElementById('c-status').value
  };
  try {
    const res = await fetch('/api/cm/dados/add/cursos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(body)});
    const data = await res.json();
    if (res.ok && data.status) location.reload();
    else alert(data.mensagem || 'Erro ao cadastrar curso.');
  } catch (err) { alert('Falha ao conectar com o servidor.'); }
}




let cacheAlunosCoordenador = { alunos: [], inscricoes: [], turmas: [], cursos: [] };

async function carregarSeccaoAlunosCoordenador() {
    try {
        const dados = await buscarPainelCoordenador();
        cacheAlunosCoordenador = {
            alunos: dados.alunos || [],
            inscricoes: dados.inscricoes || [],
            turmas: dados.turmas || [],
            cursos: dados.cursos || []
        };
        renderizarTabelaAlunosGrouped(cacheAlunosCoordenador.alunos);
    } catch (e) {
        console.error("Erro ao carregar painel do coordenador:", e);
    }
}

function obterCorEBadgeStatus(status) {
    const st = (status || 'PENDENTE').toUpperCase();
    const mapa = {
        'ATIVA': { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
        'CONCLUIDA': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
        'CANCELADA': { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
        'TRANCADA': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
        'PENDENTE': { bg: '#fef3c7', text: '#d97706', border: '#fde047' }
    };
    return mapa[st] || mapa['PENDENTE'];
}

function renderizarTabelaAlunosGrouped(listaAlunos) {
    const tbody = document.getElementById('tabela-corpo-alunos');
    const badgeCount = document.getElementById('contador-alunos-badge');
    if (!tbody) return;

    badgeCount.innerText = `${listaAlunos.length} Formando(s) Encontrado(s)`;

    if (listaAlunos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #64748b;"><i class="ri-folder-info-line" style="font-size: 1.5rem; display: block; margin-bottom: 8px;"></i> Nenhum formando encontrado com os filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaAlunos.map(aluno => {
        // Obter todas as inscrições deste aluno específico para os cursos do coordenador
        const inscricoesAluno = cacheAlunosCoordenador.inscricoes.filter(i => i.aluno_id === aluno.id);
        const avatarUrl = aluno.foto_url || 'https://via.placeholder.com/150?text=USER';

        // Renderiza lista de cursos/inscrições para a célula da tabela
        const listaCursosHTML = inscricoesAluno.length > 0 ? inscricoesAluno.map(i => {
            const curso = cacheAlunosCoordenador.cursos.find(c => c.id === i.curso_id) || {};
            const st = obterCorEBadgeStatus(i.status);
            return `
                <div style="margin-bottom: 6px; padding: 6px 10px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div>
                        <b style="color: #1e293b; display: block; font-size: 0.8rem;">${curso.nome || 'Curso #' + i.curso_id}</b>
                        <small style="color: #64748b; font-size: 0.7rem;">Cód: #${i.codigo_inscricao}</small>
                    </div>
                    <span style="background: ${st.bg}; color: ${st.text}; border: 1px solid ${st.border}; padding: 2px 8px; border-radius: 20px; font-weight: 700; font-size: 0.68rem;">
                        ${(i.status || 'PENDENTE').toUpperCase()}
                    </span>
                </div>
            `;
        }).join('') : `<span style="color: #94a3b8; font-style: italic;">Sem inscrições</span>`;

        // Renderiza lista de turmas vinculadas para a célula da tabela
        const listaTurmasHTML = inscricoesAluno.length > 0 ? inscricoesAluno.map(i => {
            const curso = cacheAlunosCoordenador.cursos.find(c => c.id === i.curso_id) || {};
            const turma = cacheAlunosCoordenador.turmas.find(t => t.id === i.turma_id);
            return `
                <div style="margin-bottom: 6px; padding: 6px 10px; border-radius: 12px; font-size: 0.78rem;">
                    ${turma 
                        ? `<span style="background: #eff6ff; color: #2563eb; padding: 3px 8px; border-radius: 20px; font-weight: 600; border: 1px solid #bfdbfe;"><i class="ri-community-line"></i> ${turma.nome}</span>`
                        : `<span style="background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 20px; font-weight: 600; border: 1px solid #fca5a5;"><i class="ri-alert-line"></i> Sem Turma (${curso.nome || 'Curso'})</span>`
                    }
                </div>
            `;
        }).join('') : `<span style="color: #94a3b8;">-</span>`;

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fcfcfd'" onmouseout="this.style.background='#fff'">
                <td style="padding: 14px 20px; display: flex; align-items: center; gap: 12px; vertical-align: top;">
                    <img src="${avatarUrl}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #cbd5e1;">
                    <div>
                        <b style="color: #1e293b; display: block; font-size: 0.9rem;">${aluno.nome || 'Desconhecido'}</b>
                        <small style="color: #64748b;">Código: ${aluno.codigo || 'ALU'}</small>
                        <div style="margin-top: 2px;">
                            <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 20px; font-weight: 600; font-size: 0.7rem;">
                                ${inscricoesAluno.length} Curso(s)
                            </span>
                        </div>
                    </div>
                </td>
                <td style="padding: 14px 20px; color: #475569; vertical-align: top;">
                    <div><i class="ri-mail-line"></i> ${aluno.email || 'N/A'}</div>
                    <small><i class="ri-phone-line"></i> ${aluno.celular || 'Sem contacto'}</small>
                </td>
                <td style="padding: 14px 20px; vertical-align: top; min-width: 220px;">
                    ${listaCursosHTML}
                </td>
                <td style="padding: 14px 20px; vertical-align: top; min-width: 180px;">
                    ${listaTurmasHTML}
                </td>
                <td style="padding: 14px 20px; text-align: right; vertical-align: top;">
                    <button type="button" onclick="abrirGestaoDetalhadaAluno(${aluno.id})" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 30px; font-weight: 600; cursor: pointer; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="ri-user-settings-line"></i> Gerir Formando
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarAlunosTabela() {
    const termo = document.getElementById('filtro-pesquisa-aluno').value.toLowerCase();
    const categoria = document.getElementById('filtro-categoria-aluno').value;

    let alunosFiltrados = cacheAlunosCoordenador.alunos.filter(aluno => {
        const inscricoes = cacheAlunosCoordenador.inscricoes.filter(i => i.aluno_id === aluno.id);
        
        const matchTexto = (aluno.nome || '').toLowerCase().includes(termo) || 
                           (aluno.email || '').toLowerCase().includes(termo) ||
                           inscricoes.some(i => (i.codigo_inscricao || '').toLowerCase().includes(termo));

        if (!matchTexto) return false;

        if (categoria === 'COM_INSCRICAO_SEM_TURMA') {
            return inscricoes.some(i => !i.turma_id);
        }
        if (categoria === 'PAGO_SEM_TURMA') {
            return inscricoes.some(i => !i.turma_id && (i.inscricao_json?.paga === true || parseFloat(i.valor_actual?.taxa_inscricao || 0) === 0));
        }
        if (categoria === 'MULTIPLOS_CURSOS') {
            return inscricoes.length >= 2;
        }

        return true;
    });

    renderizarTabelaAlunosGrouped(alunosFiltrados);
}

function abrirGestaoDetalhadaAluno(alunoId) {
    const aluno = cacheAlunosCoordenador.alunos.find(a => a.id === alunoId);
    if (!aluno) return;

    const inscricoes = cacheAlunosCoordenador.inscricoes.filter(i => i.aluno_id === alunoId);

    const inscricoesCardsHTML = inscricoes.map(insc => {
        const curso = cacheAlunosCoordenador.cursos.find(c => c.id === insc.curso_id) || {};
        const turmasDoCurso = cacheAlunosCoordenador.turmas.filter(t => t.curso_id === curso.id || t.coo_id === curso.coo_id);

        const optionsTurmas = turmasDoCurso.map(t => `<option value="${t.id}" ${t.id === insc.turma_id ? 'selected' : ''}>${t.nome} (${t.modalidade})</option>`).join('');

        return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 18px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <b style="color: #1e293b; font-size: 0.95rem; display: block;"><i class="ri-book-read-line" style="color: #2563eb;"></i> ${curso.nome || 'Curso #' + insc.curso_id}</b>
                        <small style="color: #64748b;">Inscrição Cód: #${insc.codigo_inscricao}</small>
                    </div>
                    <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                        PAGAMENTO: ${insc.status_pagamento || 'PENDENTE'}
                    </span>
                </div>

                <!-- Painel de Ações de Turma e Status para este curso -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
                    <div style="background: #fff; padding: 12px; border-radius: 18px; border: 1px solid #cbd5e1;">
                        <small style="color: #64748b; font-weight: 600; display: block; margin-bottom: 6px;">Atribuir Turma</small>
                        <div style="display: flex; gap: 8px;">
                            <select id="select-turma-${insc.id}" style="flex: 1; padding: 6px 10px; border-radius: 20px; border: 1px solid #cbd5e1; font-size: 0.8rem; outline: none;">
                                <option value="">-- Sem Turma --</option>
                                ${optionsTurmas}
                            </select>
                            <button type="button" onclick="vincularInscricaoTurma(${insc.id})" style="background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 0.75rem;">
                                Vincular
                            </button>
                        </div>
                    </div>

                    <div style="background: #fff; padding: 12px; border-radius: 18px; border: 1px solid #cbd5e1;">
                        <small style="color: #64748b; font-weight: 600; display: block; margin-bottom: 6px;">Status da Inscrição</small>
                        <div style="display: flex; gap: 8px;">
                            <select id="select-status-${insc.id}" style="flex: 1; padding: 6px 10px; border-radius: 20px; border: 1px solid #cbd5e1; font-size: 0.8rem; outline: none;">
                                <option value="PENDENTE" ${insc.status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                                <option value="ATIVA" ${insc.status === 'ATIVA' ? 'selected' : ''}>ATIVA</option>
                                <option value="CONCLUIDA" ${insc.status === 'CONCLUIDA' ? 'selected' : ''}>CONCLUIDA</option>
                                <option value="CANCELADA" ${insc.status === 'CANCELADA' ? 'selected' : ''}>CANCELADA</option>
                                <option value="TRANCADA" ${insc.status === 'TRANCADA' ? 'selected' : ''}>TRANCADA</option>
                            </select>
                            <button type="button" onclick="alterarStatusInscricao(${insc.id})" style="background: #16a34a; color: #fff; border: none; padding: 6px 12px; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 0.75rem;">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('popup-aluno-conteudo').innerHTML = `
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 25px; border: 1px solid #e2e8f0;">
            <img src="${aluno.foto_url || 'https://via.placeholder.com/150'}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Foto" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #2563eb;">
            <div>
                <h4 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1.1rem;">${aluno.nome || 'N/A'}</h4>
                <div style="font-size: 0.85rem; color: #64748b;"><i class="ri-mail-line"></i> ${aluno.email} | <i class="ri-phone-line"></i> ${aluno.celular || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: #2563eb; margin-top: 2px; font-weight: 600;">Inscrito em ${inscricoes.length} curso(s) no sistema</div>
            </div>
        </div>

        <h5 style="margin: 0 0 12px 0; color: #1e293b; font-size: 0.95rem;">Cursos & Inscrições Associadas:</h5>
        ${inscricoesCardsHTML}

        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button type="button" onclick="fecharPopupAluno()" style="background: #64748b; color: #fff; border: none; padding: 8px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Fechar</button>
        </div>
    `;

    document.getElementById('popup-gestao-aluno').style.display = 'flex';
}

function fecharPopupAluno() {
    document.getElementById('popup-gestao-aluno').style.display = 'none';
}

async function vincularInscricaoTurma(inscricaoId) {
    const turmaId = document.getElementById(`select-turma-${inscricaoId}`).value;
    if (!turmaId) {
        alert('Por favor, selecione uma turma válida.');
        return;
    }

    try {
        const res = await fetch(`/api/cm/dados/coo/turmas/${turmaId}/atribuir-aluno`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ inscricao_id: inscricaoId })
        }).then(r => r.json());

        if (!res.status && res.error) throw new Error(res.error);
        alert('Turma vinculada com sucesso à inscrição!');
        fecharPopupAluno();
        carregarSeccaoAlunosCoordenador();
    } catch (e) {
        alert('Erro ao vincular turma: ' + e.message);
    }
}

async function alterarStatusInscricao(inscricaoId) {
    const novoStatus = document.getElementById(`select-status-${inscricaoId}`).value;

    try {
        const res = await fetch(`/api/cm/dados/coo/inscricoes/${inscricaoId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ status: novoStatus })
        }).then(r => r.json());

        if (!res.status && res.error) throw new Error(res.error);
        alert('Status da inscrição atualizado com sucesso!');
        fecharPopupAluno();
        carregarSeccaoAlunosCoordenador();
    } catch (e) {
        alert('Erro ao alterar status: ' + e.message);
    }
}


//******************************************************* */
function reload(){
  carregarEInjetarStatsCOO()
  renderizarTabelaCoordenadores()
  carregarERenderizarTurmas() 
  carregarSeccaoAlunosCoordenador();
}

reload()