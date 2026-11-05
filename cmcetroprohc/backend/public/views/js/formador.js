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
  loader.style.width = '100%';  
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active'); 
  if (window.innerWidth <= 768) { toggleSidebar(); }

  setTimeout(() => {  
    document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');
    const targetPage = document.getElementById(`page-${targetPageId}`);
    if (targetPage) targetPage.style.display = 'block'; 
    isNavigating = false;
  }, 1000);
}

async function buscarPainelProfessor() {
  const res = await fetch('/api/cm/dados/professor/meu-painel', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  return (await res.json());
}

async function carregarPainelFormador() {
  const { turmas = [], conteudos = [], inscricoes = [] } = await buscarPainelProfessor();
  document.getElementById('val-turmas').innerText = turmas.length;
  document.getElementById('val-alunos').innerText = inscricoes.length;
  
  // Como conteudos na API vem num array plano ou agrupado, extraímos a soma real dos elementos internos se necessário, ou o tamanho do array
  const totalModulosCalc = conteudos.reduce((acc, c) => acc + (c.modulos_json?.length || 0), 0);
  document.getElementById('val-conteudos').innerText = totalModulosCalc || conteudos.length;
  
  document.getElementById('val-progresso').innerText = (inscricoes.length ? Math.round(inscricoes.reduce((a,b)=>a+(b.desempenho_json?.progresso_porcentagem||0),0)/inscricoes.length) : 0) + '%';
}

let dadosPainelGlobal = null, turmaAtivaId = null;

async function inicializarSalaAula() {
  dadosPainelGlobal = await buscarPainelProfessor();
  const select = document.getElementById('select-turma-sala');
  if (!dadosPainelGlobal?.turmas?.length) return select.innerHTML = '<option>Nenhuma turma encontrada</option>';
  
  select.innerHTML = dadosPainelGlobal.turmas.map(t => `<option value="${t.id}">${t.nome} (${t.modalidade})</option>`).join('');
  trocarTurmaSala(dadosPainelGlobal.turmas[0].id);
}

function trocarTurmaSala(turmaId) {
  turmaAtivaId = Number(turmaId);
  const turma = dadosPainelGlobal.turmas.find(t => t.id === turmaAtivaId) || {};
  
  // Filtra o bloco de conteúdos correspondente à turma ativa
  const registroTurmaConteudo = (dadosPainelGlobal.conteudos || []).find(c => Number(c.turma_id) === turmaAtivaId) || {};
  const modulosTurma = registroTurmaConteudo.modulos_json || [];
  const aulasTurma = registroTurmaConteudo.aulas_json || [];
  const exerciciosTurma = registroTurmaConteudo.avaliacoes_json || [];

  const inscricoes = (dadosPainelGlobal.inscricoes || []).filter(i => Number(i.turma_id) === turmaAtivaId);

  document.getElementById('txt-turma-ativa').innerText = `ESTA GERIR: ${turma.nome || 'Turma'}`;
  document.getElementById('mc-modulos').innerText = modulosTurma.length;
  document.getElementById('mc-aulas').innerText = aulasTurma.length;
  document.getElementById('mc-exercicios').innerText = exerciciosTurma.length;
  document.getElementById('mc-alunos').innerText = inscricoes.length;
  document.getElementById('mc-vagas').innerText = (turma.vagas_totais - turma.vagas_preenchidas) || 0;
  
  const media = inscricoes.length ? Math.round(inscricoes.reduce((a,b)=>a+(b.desempenho_json?.progresso_porcentagem||0),0)/inscricoes.length) : 0;
  document.getElementById('mc-progresso').innerText = media + '%';

  const listaAlunosEl = document.getElementById('lista-formandos-turma');
  listaAlunosEl.innerHTML = inscricoes.length ? inscricoes.map(i => `
    <div class="card-aluno" onclick="verDetalhesAluno(${i.aluno?.id || i.aluno_id})">
      <b style="color:#1e293b;">${i.aluno?.nome || 'Aluno #'+i.aluno_id}</b>
      <div style="font-size:0.8rem; color:#64748b;">${i.aluno?.email || 'Sem e-mail'}</div>
      <div style="font-size:0.75rem; margin-top:6px; display:flex; justify-content:space-between; color:#059669; font-weight:600;">
        <span>Progresso: ${i.desempenho_json?.progresso_porcentagem || 0}%</span>
        <span>Aulas: ${i.desempenho_json?.aulas_concluidas || 0}</span>
      </div>
    </div>
  `).join('') : '<p style="font-size:0.85rem; color:#64748b;">Nenhum formando inscrito nesta turma.</p>';
}

function verDetalhesAluno(alunoId) { alert('Perfil do formando ID: ' + alunoId); }
function fecharPopup() { document.getElementById('popup-generico').style.display = 'none'; }

function abrirPopupConteudosGeral() {
  const registroTurmaConteudo = (dadosPainelGlobal.conteudos || []).find(c => Number(c.turma_id) === turmaAtivaId) || {};
  const modulos = registroTurmaConteudo.modulos_json || [];
  const aulas = registroTurmaConteudo.aulas_json || [];
  const exercicios = registroTurmaConteudo.avaliacoes_json || [];
  
  let htmlModulos = '';
  if (modulos.length === 0) {
    htmlModulos = '<p style="color:#64748b; text-align:center;">Nenhum módulo registado.</p>';
  } else {
    modulos.forEach(m => {
      const aulasDoMod = aulas.filter(a => Number(a.modulo_id) === Number(m.id));
      const exerciciosDoMod = exercicios.filter(e => Number(e.modulo_id) === Number(m.id));
      
      htmlModulos += `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:30px; padding:20px; margin-bottom:15px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#1e293b; font-size:1rem;"><i class="ri-folder-open-line"></i> ${m.nome || m.titulo}</h4>
            <div>
              <button onclick="editarConteudo(${m.id})" style="background:none;border:none;color:#2563eb;cursor:pointer;font-weight:600;font-size:0.8rem;">Editar</button>
              <button onclick="excluirConteudo(${m.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:600;font-size:0.8rem;margin-left:8px;">Excluir</button>
            </div>
          </div>
          
          <div style="margin-left:15px; margin-bottom:10px;">
            <b style="font-size:0.85rem; color:#2563eb;">Aulas:</b>
            <ul style="margin:5px 0; padding-left:15px; font-size:0.85rem;">
              ${aulasDoMod.length ? aulasDoMod.map(a => `<li>${a.nome || a.titulo} <button onclick="editarConteudo(${a.id})" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:0.75rem;">[Editar]</button><button onclick="excluirConteudo(${a.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.75rem;">[Excluir]</button></li>`).join('') : '<li style="color:#64748b;">Nenhuma aula.</li>'}
            </ul>
          </div>

          <div style="margin-left:15px;">
            <b style="font-size:0.85rem; color:#d97706;">Exercícios:</b>
            <ul style="margin:5px 0; padding-left:15px; font-size:0.85rem;">
              ${exerciciosDoMod.length ? exerciciosDoMod.map(e => `<li>${e.nome || e.titulo} <button onclick="editarConteudo(${e.id})" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:0.75rem;">[Editar]</button><button onclick="excluirConteudo(${e.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.75rem;">[Excluir]</button></li>`).join('') : '<li style="color:#64748b;">Nenhum exercício.</li>'}
            </ul>
          </div>
        </div>`;
    });
  }

  document.getElementById('popup-body').innerHTML = `
    <h3 style="margin-top:0;">Estrutura de Conteúdos</h3>
    <div style="max-height:60vh; overflow-y:auto; padding-right:5px;">${htmlModulos}</div>
    <div style="display:flex; justify-content:flex-end; margin-top:20px;">
      <button class="btn-acao" style="background:#64748b;" onclick="fecharPopup()">Fechar</button>
    </div>`;
  document.getElementById('popup-generico').style.display = 'flex';
}

function editarConteudo(id) { alert('Editar conteúdo ID: ' + id); }
function excluirConteudo(id) { if(confirm('Deseja excluir este conteúdo?'));}


// POPUP: Adicionar Conteúdo
function abrirPopupAdicionarConteudo() {
  const registroTurmaConteudo = (dadosPainelGlobal.conteudos || []).find(c => Number(c.turma_id) === turmaAtivaId) || {};
  const modulos = registroTurmaConteudo.modulos_json || [];
  const optionsModulos = modulos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

  document.getElementById('popup-body').innerHTML = `
    <h3 style="margin-top:0;">Adicionar Conteúdo</h3>
    <div class="form-group"><label>Tipo de Conteúdo</label>
      <select id="pop-tipo" onchange="mudarFormConteudo(this.value)">
        <option value="AULA">Aula</option>
        <option value="MODULO">Módulo</option>
        <option value="EXERCICIO">Exercício</option>
      </select>
    </div>
    <div id="form-dinamico-conteudo">
      <div class="form-group"><label>Módulo Associado</label><select id="pop-modulo-id">${optionsModulos || '<option value="">Nenhum módulo criado</option>'}</select></div>
      <div class="form-group"><label>Título da Aula</label><input type="text" id="pop-nome"></div>
      <div class="form-group"><label>URL do Vídeo</label><input type="text" id="pop-url"></div>
      <div class="form-group"><label>Duração (Minutos)</label><input type="number" id="pop-duracao" value="15"></div>
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button type="button" class="btn-acao" style="background:#64748b;" onclick="fecharPopup()">Cancelar</button>
      <button type="button" class="btn-acao" onclick="salvarConteudoTurma(document.getElementById('pop-tipo').value)">Salvar</button>
    </div>`;
  document.getElementById('popup-generico').style.display = 'flex';
}

function mudarFormConteudo(tipo) {
    const c = document.getElementById('form-dinamico-conteudo');
    const registroTurmaConteudo = (dadosPainelGlobal.conteudos || []).find(x => Number(x.turma_id) === turmaAtivaId) || {};
    const modulos = registroTurmaConteudo.modulos_json || [];
    const opts = modulos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');

    if (tipo === 'MODULO') {
        c.innerHTML = `<div class="form-group"><label>Nome do Módulo</label><input type="text" id="pop-nome"></div>`;
    } else if (tipo === 'EXERCICIO') {
        c.innerHTML = `
            <div class="form-group"><label>Módulo Associado</label><select id="pop-modulo-id">${opts || '<option value="">Nenhum módulo criado</option>'}</select></div>
            <div class="form-group"><label>Título do Exercício</label><input type="text" id="pop-nome"></div>
            <div class="form-group"><label>Instruções / Enunciado</label><textarea id="pop-desc" rows="3"></textarea></div>
            <div class="form-group"><label>URL do PDF / Material (Opcional)</label><input type="text" id="pop-url"></div>
        `;
    } else { // AULA
        c.innerHTML = `
            <div class="form-group"><label>Módulo Associado</label><select id="pop-modulo-id">${opts || '<option value="">Nenhum módulo criado</option>'}</select></div>
            <div class="form-group"><label>Título da Aula</label><input type="text" id="pop-nome"></div>
            <div class="form-group"><label>URL do Vídeo</label><input type="text" id="pop-url"></div>
            <div class="form-group"><label>Duração (Minutos)</label><input type="number" id="pop-duracao" value="15"></div>
        `;
    }
}

async function salvarConteudoTurma(tipo) {
    try {
        const tipoFinal = tipo || document.getElementById('pop-tipo')?.value || 'AULA';
        const [n, u] = [document.getElementById('pop-nome')?.value, document.getElementById('pop-url')?.value];
        if (!n) throw new Error('Nome obrigatório.');
        if ((tipoFinal === 'AULA' || tipoFinal === 'VIDEO' || u) && !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|drive\.google\.com)\/.+$/.test(u)) throw new Error('Apenas YouTube ou Google Drive.');
        const res = await fetch('/api/cm/dados/turmas/conteudos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ turma_id: turmaAtivaId, tipo: tipoFinal, nome: n, modulo_id: document.getElementById('pop-modulo-id')?.value || null, descricao: document.getElementById('pop-desc')?.value || '', url: u || '', duracao: document.getElementById('pop-duracao')?.value || 15 }) }).then(r => r.json());
        if (!res.status && res.error) throw new Error(res.error);
        alert('Guardado com sucesso!'); fecharPopup(); if (typeof carregarDadosPainel === 'function') carregarDadosPainel(); else location.reload();
    } catch (e) { alert('Erro: ' + e.message); }
}

// POPUP: Dar Aviso
function abrirPopupAviso() {
  document.getElementById('popup-body').innerHTML = `
    <h3 style="margin-top:0;">Enviar Aviso</h3>
    <div class="form-group"><label>Título</label><input type="text" id="pop-aviso-titulo"></div>
    <div class="form-group"><label>Mensagem</label><textarea id="pop-aviso-msg" rows="3"></textarea></div>
    <div class="form-group"><label>Canal</label>
      <select onchange="if(this.value==='EMAIL') alert('E-mail indisponível.');">
        <option value="PLATAFORMA">Plataforma</option>
        <option value="EMAIL">E-mail (Indisponível)</option>
      </select>
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn-acao" style="background:#64748b;" onclick="fecharPopup()">Cancelar</button>
      <button class="btn-acao" style="background:#0284c7;" onclick="fecharPopup(); alert('Aviso enviado!');">Enviar</button>
    </div>`;
  document.getElementById('popup-generico').style.display = 'flex';
}

// POPUP: Regras da Turma
function abrirPopupRegras() {
  const turma = (dadosPainelGlobal.turmas || []).find(t => t.id === turmaAtivaId) || {};
  document.getElementById('popup-body').innerHTML = `
    <h3 style="margin-top:0;">Regras da Turma</h3>
    <div class="form-group"><label>Nome</label><input type="text" value="${turma.nome || ''}" readonly></div>
    <div class="form-group"><label>Início</label><input type="date" value="${turma.data_inicio || ''}"></div>
    <div class="form-group"><label>Fim</label><input type="date" value="${turma.data_fim || ''}"></div>
    <div class="form-group"><label>Vagas</label><input type="number" value="${turma.vagas_totais || 0}"></div>
    <div class="form-group"><label>Horário</label><input type="text" value="${turma.horario || ''}"></div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn-acao" style="background:#64748b;" onclick="fecharPopup()">Cancelar</button>
      <button class="btn-acao" style="background:#16a34a;" onclick="fecharPopup(); alert('Atualizado!');">Salvar</button>
    </div>`;
  document.getElementById('popup-generico').style.display = 'flex';
}

function reload(){
  carregarPainelFormador();
  inicializarSalaAula();
}
reload();