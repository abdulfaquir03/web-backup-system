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
    if (window.innerWidth <= 768) { toggleSidebar() }
    setTimeout(() => {
        document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');
        const targetPage = document.getElementById(`page-${targetPageId}`);
        if (targetPage) targetPage.style.display = 'block';
        isNavigating = false;
    }, 1000);
}

async function buscarDadosFinanceiros() {
    const res = await fetch('/api/cm/dados/financeiro/inscricoes-cursos', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    return await res.json();
}

async function buscarCarteirasSeguro() {
  try { const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
    if (!t) return []; const r = await fetch('/api/cm/dados/carteiras', { headers: { 'Authorization': `Bearer ${t}` } });
    if (!r.ok) return []; const dados = await r.json();
    return Array.isArray(dados) ? dados : [];
  } catch (e) { console.warn("Falha ao carregar carteiras, retornando lista vazia:", e.message);
    return [];
  }
}


async function atualizarCardsDashboard() {
    try {
        const dados = await buscarDadosFinanceiros();
        if (!dados) return;
        const inscricoes = dados.inscricoes || []; const cursos = dados.cursos || [];
        const pendentes = inscricoes.filter(i => i.status === 'PENDENTE').length;
        const ativas = inscricoes.filter(i => i.status === 'ATIVO').length;
        const receitaTotal = inscricoes.reduce((acc, inscricao) => {
            const curso = cursos.find(c => c.id === inscricao.curso_id);
            return acc + (curso ? parseFloat(curso.preco || 0) : 0);
        }, 0);

        document.getElementById('stat-receita').innerText = receitaTotal.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
        document.getElementById('stat-cursos').innerText = cursos.length;
        document.getElementById('stat-pendentes').innerText = pendentes;
        document.getElementById('stat-ativas').innerText = ativas;

    } catch (error) {
        console.error('Erro ao atualizar cards do dashboard:', error);
    }
}



let estadoGlobal = { dadosApi: null, abaAtiva: 'cursos', usuarioLogadoId: null, usuarios: null };
async function buscarUsuarios() {
    const res = await fetch('/api/cm/dados/financeiro/usuarios', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    return res.ok ? (data.usuarios || data) : (alert(data.mensagem || 'Erro ao carregar usuários'), null);
}

async function carregarEExibirFinanceiro() {
    try {
        const payloadToken = JSON.parse(atob((localStorage.getItem('token') || '').split('.')[1] || '{}'));
        estadoGlobal.usuarioLogadoId = payloadToken.id || null;

        estadoGlobal.dadosApi = await buscarDadosFinanceiros();
        renderizarListagem();
    } catch (err) {
        console.error('Erro ao renderizar painel financeiro:', err);
    }
}

function alternarAba(aba) {
    estadoGlobal.abaAtiva = aba;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(aba)));
    renderizarListagem();
}



async function renderizarListagem() {
    const container = document.getElementById('lista-conteudo');
    const filtro = document.getElementById('filtro-status').value;
    if (!container) return;
    container.innerHTML = '';

    const mapaAlunos = {};
    (estadoGlobal.dadosApi.usuarios || estadoGlobal.dadosApi.alunos || []).forEach(u => mapaAlunos[u.id] = u.nome || `Aluno #${u.id}`);
    
    const mapaCursos = {};
    (estadoGlobal.dadosApi.cursos || []).forEach(c => mapaCursos[c.id] = c.nome || `Curso #${c.id}`);

    if (estadoGlobal.abaAtiva === 'cursos') {
        const cursos = (estadoGlobal.dadosApi.cursos || []).filter(c => filtro === 'TODOS' || c.status === filtro);
        cursos.forEach(c => {
            const statusCurso = (c.status || 'ATIVO').toUpperCase();
            const corStatus = statusCurso === 'ATIVO' || statusCurso === 'ACTIVO' ? '#16a34a' : '#d97706';
            const bgStatus = statusCurso === 'ATIVO' || statusCurso === 'ACTIVO' ? '#dcfce7' : '#fef3c7';

            const item = document.createElement('div');
            item.className = 'list-item card-item-interativo';
            item.style.cssText = 'background:#fff; padding:16px 20px; border-radius:30px; border:1px solid #e2e8f0; margin-bottom:10px; cursor:pointer; transition:0.2s;';
            item.onclick = () => exibirDetalhesCursoContainerEsquerdo(c);
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong><i class="ri-book-open-line" style="color:#2563eb; margin-right:6px;"></i>${c.nome}</strong>
                    <span style="background:${bgStatus}; color:${corStatus}; padding:4px 12px; border-radius:30px; font-weight:700; font-size:0.75rem; border:1px solid ${corStatus};">${c.status}</span>
                </div>
                <small style="color:#64748b;"><i class="ri-folder-line"></i> Área: ${c.area || 'Geral'} | <i class="ri-time-line"></i> Carga: ${c.carga_horaria || 0}h</small><br>
                <div style="margin-top:8px; display:flex; gap:8px; font-size:0.75rem;">
                    <span style="background:#eff6ff; color:#2563eb; padding:3px 10px; border-radius:30px; font-weight:600;"><i class="ri-money-dollar-circle-line"></i> Preço: ${c.preco || '0.00'} MT</span>
                    <span style="background:#f1f5f9; color:#475569; padding:3px 10px; border-radius:30px; font-weight:600;"><i class="ri-file-text-line"></i> Inscrição: ${c.taxa_inscricao || '0.00'} MT</span>
                </div>
            `;
            container.appendChild(item);
        });
    } else {
        const inscricoes = (estadoGlobal.dadosApi.inscricoes || []).filter(i => filtro === 'TODOS' || i.status === filtro);
        inscricoes.forEach(i => {
            const statusInsc = (i.status || 'PENDENTE').toUpperCase();
            const corStatus = statusInsc === 'APROVADO' || statusInsc === 'ATIVO' ? '#16a34a' : statusInsc === 'REJEITADO' ? '#dc2626' : '#d97706';
            const bgStatus = statusInsc === 'APROVADO' || statusInsc === 'ATIVO' ? '#dcfce7' : statusInsc === 'REJEITADO' ? '#fee2e2' : '#fef3c7';

            const nomeAluno = mapaAlunos[i.aluno_id] || i.aluno?.nome || `Formando #${i.aluno_id}`;
            const nomeCurso = mapaCursos[i.curso_id] || i.curso?.nome || `Curso #${i.curso_id}`;
            const totalPrestacoes = (i.mensalidades_json || []).length;
            const prestacoesPagas = (i.mensalidades_json || []).filter(m => m.status === 'PAGO' || m.status === 'APROVADO').length;

            const item = document.createElement('div');
            item.className = 'list-item card-item-interativo';
            item.style.cssText = 'background:#fff; padding:16px 20px; border-radius:30px; border:1px solid #e2e8f0; margin-bottom:10px; cursor:pointer; transition:0.2s;';
            item.onclick = () => exibirDetalhesInscricaoContainerEsquerdo(i.id);
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong><i class="ri-file-user-line" style="color:#2563eb; margin-right:6px;"></i>Inscrição: #${i.codigo_inscricao || i.id}</strong>
                    <span style="background:${bgStatus}; color:${corStatus}; padding:4px 12px; border-radius:30px; font-weight:700; font-size:0.75rem; border:1px solid ${corStatus};">${i.status}</span>
                </div>
                <div style="font-size:0.85rem; color:#1e293b; margin-bottom:4px;">
                    <i class="ri-user-line" style="color:#64748b;"></i> <b>Aluno:</b> ${nomeAluno}
                </div>
                <div style="font-size:0.8rem; color:#475569; margin-bottom:6px;">
                    <i class="ri-book-line" style="color:#64748b;"></i> <b>Curso:</b> ${nomeCurso}
                </div>
                <div style="margin-top:8px; display:flex; gap:8px; font-size:0.75rem;">
                    <span style="background:#f1f5f9; color:#475569; padding:3px 10px; border-radius:30px; font-weight:600;"><i class="ri-bank-card-line"></i> Pagamento: ${i.status_pagamento || 'PENDENTE'}</span>
                    <span style="background:#eff6ff; color:#2563eb; padding:3px 10px; border-radius:30px; font-weight:600;"><i class="ri-check-double-line"></i> Prestações: ${prestacoesPagas}/${totalPrestacoes}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }
}


function exibirDetalhesCursoContainerEsquerdo(dados) {
    const container = document.getElementById('container-esquerdo');
    if (!container) return;
    
    const semPreco = dados.preco_status !== 'DEFINIDO';

    container.innerHTML = `
        <div class="detail-section">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
                <h3 style="margin:0; font-size:1.05rem;"><i class="ri-book-2-line"></i> ${dados.nome}</h3>
                <span style="font-size:0.75rem; color:#2563eb; background:#eff6ff; padding:4px 9px; border-radius:30px;"><i class="ri-information-line"></i> Detalhes do Curso</span>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
                <p style="margin:0;"><strong><i class="ri-folder-line"></i> Área:</strong> ${dados.area}</p>
                <p style="margin:0;"><strong><i class="ri-file-text-line"></i> Descrição:</strong> ${dados.descricao || 'N/A'}</p>
                <p style="margin:0;"><strong><i class="ri-time-line"></i> Carga Horária:</strong> ${dados.carga_horaria || 0} horas</p>
                ${!semPreco ? `
                    <p style="margin:0;"><strong><i class="ri-money-dollar-circle-line"></i> Preço do Curso:</strong> ${dados.preco} MT</p>
                    <p style="margin:0;"><strong><i class="ri-file-paper-line"></i> Taxa de Inscrição:</strong> ${dados.taxa_inscricao} MT</p>
                    <p style="margin:0;"><strong><i class="ri-award-line"></i> Taxa de Certificado:</strong> ${dados.taxa_certificado} MT</p>
                    <p style="margin:0;"><strong><i class="ri-list-ordered"></i> Nº de Prestações:</strong> ${dados.num_prestacoes}</p>
                    <p style="margin:0;"><strong><i class="ri-user-star-line"></i> Operador Financeiro:</strong> ${dados.fin_nome || 'Registado'}</p>
                ` : ''}
                <p style="margin:0;"><strong><i class="ri-shield-check-line"></i> Status:</strong> <span class="badge ${dados.status === 'ATIVO' ? 'badge-sucesso' : 'badge-alerta'}">${dados.status}</span></p>
            </div>

            ${semPreco ? `
                <div style="margin-top: 14px; background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 8px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: #1e293b;"><i class="ri-coins-line"></i> Definir Preços e Taxas</h4>
                    <input type="number" id="inp-preco" placeholder="Preço do Curso (MT)" style="padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" />
                    <input type="number" id="inp-taxa-inscricao" placeholder="Taxa de Inscrição (MT)" style="padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" />
                    <input type="number" id="inp-taxa-certificado" placeholder="Taxa de Certificado (MT)" style="padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" />
                    <input type="number" id="inp-num-prestacoes" placeholder="Nº de Prestações" style="padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" />
                    <button type="button" onclick="confirmarEAprovarCurso(${dados.id})" style="background: #2563eb; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; margin-top: 4px;">Aprovar e Definir Preços</button>
                </div>
            ` : ''}
        </div>
    `;
}

const cacheDetalhesInscricao = {};

async function exibirDetalhesInscricaoContainerEsquerdo(inscricaoId) {
    const container = document.getElementById('container-esquerdo');
    if (!container) return;

    if (cacheDetalhesInscricao[inscricaoId]) {console.log(cacheDetalhesInscricao)
        renderizarHtmlInscricaoDetalhes(cacheDetalhesInscricao[inscricaoId], container);
        return;
    }

    container.innerHTML = `
        <div class="detail-section" style="text-align: center; padding: 30px;">
            <i class="ri-loader-4-line" style="font-size: 1.5rem; animation: spin 1s linear infinite; color: #2563eb;"></i>
            <p style="color: #64748b; margin-top: 8px; font-size: 0.85rem;">A carregar detalhes da inscrição...</p>
        </div>
    `;
    

    try {
        const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
        const res = await fetch(`/api/cm/dados/operador/inscricao/${inscricaoId}`, { headers: { 'Authorization': `Bearer ${t}` } });
        if (!res.ok) throw new Error('Erro ao carregar.');
        const data = await res.json();
        
        cacheDetalhesInscricao[inscricaoId] = data;
        renderizarHtmlInscricaoDetalhes(data, container);
    } catch (e) {
        container.innerHTML = `
            <div class="detail-section" style="padding: 20px; text-align: center;">
                <i class="ri-error-warning-line" style="font-size: 1.5rem; color: #dc2626;"></i>
                <p style="color: #dc2626; margin-top: 8px; font-size: 0.85rem;">Erro ao carregar detalhes da inscrição.</p>
            </div>
        `;
    }
}

function renderizarHtmlInscricaoDetalhes(data, container) {
    const insc = data.inscricao;
    const val = insc.valor_actual || {};
    const aluno = data.aluno || {};
    const curso = data.curso || {};
    const coord = data.coordenador || {};

    const formatarStatusBadge = (status) => {
        const s = (status || 'PENDENTE').toUpperCase();
        const cor = s === 'APROVADO' || s === 'PAGO' ? '#16a34a' : s === 'REJEITADO' ? '#dc2626' : '#d97706';
        const bg = s === 'APROVADO' || s === 'PAGO' ? '#dcfce7' : s === 'REJEITADO' ? '#fee2e2' : '#fef3c7';
        return `<span style="background:${bg}; color:${cor}; padding:4px 12px; border-radius:30px; font-weight:700; font-size:0.75rem; border:1px solid ${cor};">${s}</span>`;
    };

    // 1. Taxa de Inscrição
    const taxaInscricaoValor = parseFloat(val.taxa_inscricao || 0);
    let htmlTaxaInscricao = '';
    if (taxaInscricaoValor > 0) {
        const inscJson = insc.inscricao_json || {};
        const compInsc = inscJson.comprovativo;
        const statusInsc = inscJson.status || 'PENDENTE';
        
        htmlTaxaInscricao = `
            <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong><i class="ri-file-text-line" style="color:#2563eb;"></i> Taxa de Inscrição (${taxaInscricaoValor.toFixed(2)} MT)</strong>
                    ${formatarStatusBadge(statusInsc)}
                </div>
                ${compInsc ? `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="background:#fff; padding:10px; border-radius:30px; border:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                            <small style="color:#475569;"><i class="ri-time-line"></i> Submetido: ${inscJson.data_submissao ? new Date(inscJson.data_submissao).toLocaleString() : 'N/A'}</small>
                            <button onclick="abrirImagemTelaCheia('${compInsc}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                                <i class="ri-eye-line"></i> Ver Comprovativo
                            </button>
                        </div>
                        <div style="text-align:center;">
                            <img src="${compInsc}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Inscrição" style="max-height:140px; border-radius:20px; border:1px solid #cbd5e1; cursor:pointer; object-fit:contain;" onclick="abrirImagemTelaCheia('${compInsc}')">
                        </div>
                    </div>
                ` : '<small style="color:#94a3b8; display:block;"><i class="ri-information-line"></i> Nenhum comprovativo submetido.</small>'}
                
                ${statusInsc === 'EM_VERIFICACAO' ? `
                    <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_inscricao', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-check-line"></i> Aprovar Taxa
                        </button>
                        <button onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_inscricao', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-close-line"></i> Rejeitar
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 2. Prestações
    const htmlPrestacoes = (insc.mensalidades_json || []).map(m => `
        <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong><i class="ri-calendar-check-line" style="color:#2563eb;"></i> Prestação ${m.n_prestacao} - ${m.valor} MT</strong>
                ${formatarStatusBadge(m.status)}
            </div>
            ${m.comprovativo ? `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="background:#fff; padding:10px; border-radius:30px; border:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                        <small style="color:#475569;"><i class="ri-time-line"></i> Submetido: ${m.data_pagamento ? new Date(m.data_pagamento).toLocaleString() : 'N/A'}</small>
                        <button onclick="abrirImagemTelaCheia('${m.comprovativo}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                            <i class="ri-eye-line"></i> Ver Comprovativo
                        </button>
                    </div>
                    <div style="text-align:center;">
                        <img src="${m.comprovativo}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Prestação" style="max-height:140px; border-radius:20px; border:1px solid #cbd5e1; cursor:pointer; object-fit:contain;" onclick="abrirImagemTelaCheia('${m.comprovativo}')">
                    </div>
                </div>
            ` : '<small style="color:#94a3b8; display:block;"><i class="ri-information-line"></i> Sem comprovativo anexado.</small>'}
            
            ${m.status === 'EM_VERIFICACAO' ? `
                <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="processarAprovacaoFinanceira(${insc.id}, 'prestacao_${m.n_prestacao}', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                        <i class="ri-check-line"></i> Aprovar Prestação ${m.n_prestacao}
                    </button>
                    <button onclick="processarAprovacaoFinanceira(${insc.id}, 'prestacao_${m.n_prestacao}', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                        <i class="ri-close-line"></i> Rejeitar
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');

    // 3. Certificado
    const taxaCertificadoValor = parseFloat(val.taxa_certificado || 0);
    const certJson = insc.certificado_json || {};
    const compCert = certJson.comprovativo_taxa;
    const statusCert = certJson.taxa_paga ? 'PAGO' : (certJson.em_verificacao ? 'EM_VERIFICACAO' : 'PENDENTE');

    container.innerHTML = `
        <div class="detail-section">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;">
                <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:6px;">
                    <i class="ri-file-search-line" style="color:#2563eb;"></i> Inscrição #${insc.codigo_inscricao}
                </h3>
                <span style="font-size:0.75rem; color:#16a34a; background:#dcfce7; padding:4px 10px; border-radius:30px; display:flex; align-items:center; gap:4px; font-weight:600;">
                    <i class="ri-flash-light-line"></i> Cache Ativo
                </span>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:30px; margin-bottom:15px; font-size:0.9rem; display:flex; flex-direction:column; gap:6px; border:1px solid #e2e8f0;">
                <p style="margin:0;"><strong><i class="ri-user-line"></i> Aluno:</strong> ${aluno.nome || 'N/A'} (${aluno.email || ''})</p>
                <p style="margin:0;"><strong><i class="ri-book-open-line"></i> Curso:</strong> ${curso.nome || 'N/A'}</p>
                <p style="margin:0;"><strong><i class="ri-user-star-line"></i> Coordenador:</strong> ${coord.nome || 'N/A'}</p>
                <p style="margin:0; display:flex; align-items:center; gap:8px;"><strong><i class="ri-shield-check-line"></i> Status Geral:</strong> ${formatarStatusBadge(insc.status)}</p>
            </div>

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">1. Taxa de Inscrição</h4>
            ${htmlTaxaInscricao || '<p style="font-size:0.85rem; color:#64748b;">Sem taxa aplicável.</p>'}

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">2. Prestações do Curso</h4>
            ${htmlPrestacoes || '<p style="font-size:0.85rem; color:#64748b;">Nenhuma prestação cadastrada.</p>'}

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">3. Taxa de Certificado (${taxaCertificadoValor.toFixed(2)} MT)</h4>
            <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; font-size:0.9rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span>Status:</span> ${formatarStatusBadge(statusCert)}
                </div>
                ${compCert ? `
                    <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
                        <button onclick="abrirImagemTelaCheia('${compCert}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; width:fit-content; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-eye-line"></i> Ver Comprovativo do Certificado
                        </button>
                        <div style="text-align:center;">
                            <img src="${compCert}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Certificado" style="max-height:140px; border-radius:20px; border:1px solid #cbd5e1; cursor:pointer; object-fit:contain;" onclick="abrirImagemTelaCheia('${compCert}')">
                        </div>
                    </div>
                ` : '<small style="color:#94a3b8; display:block;">Sem comprovativo de certificado anexado.</small>'}
                
                ${statusCert === 'EM_VERIFICACAO' ? `
                    <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_certificado', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-check-line"></i> Aprovar Certificado
                        </button>
                        <button onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_certificado', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-close-line"></i> Rejeitar
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}


function aprovarTransacaoInscricao(inscricaoId, itemAprovado) {
    console.log(`✅ [APROVAÇÃO SOLICITADA] Inscrição ID: ${inscricaoId} | Item: ${itemAprovado}`);
    alert(`Aprovação solicitada para: ${itemAprovado} (Inscrição #${inscricaoId}). Verifique o console para detalhes.`);
    delete cacheDetalhesInscricao[inscricaoId];
}




async function exibirDetalhesInscricaoContainerEsquerdo(inscricaoId) {
    const container = document.getElementById('container-esquerdo');
    if (!container) return;

    if (cacheDetalhesInscricao[inscricaoId]) {
        renderizarHtmlInscricaoDetalhes(cacheDetalhesInscricao[inscricaoId], container);
        return;
    }

    container.innerHTML = `<div class="detail-section"><p style="color: #666; text-align:center; padding:20px;">A carregar detalhes da inscrição...</p></div>`;

    try {
        const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
        const res = await fetch(`/api/cm/dados/operador/inscricao/${inscricaoId}`, { headers: { 'Authorization': `Bearer ${t}` } });
        if (!res.ok) throw new Error('Erro ao carregar.');
        const data = await res.json();
        
        // Salva no cache para nunca mais precisar de fetch para esta mesma inscrição
        cacheDetalhesInscricao[inscricaoId] = data;

        renderizarHtmlInscricaoDetalhes(data, container);
    } catch (e) {
        container.innerHTML = `<div class="detail-section"><p style="color: #ef4444;">Erro ao carregar detalhes da inscrição.</p></div>`;
    }
}

function renderizarHtmlInscricaoDetalhes(data, container) {
    const insc = data.inscricao || {};
    const val = insc.valor_actual || {};
    const aluno = data.aluno || {};
    const curso = data.curso || {};
    const coord = data.coordenador || {};

    const formatarStatusBadge = (status) => {
        const s = (status || 'PENDENTE').toUpperCase();
        const cor = s === 'APROVADO' || s === 'PAGO' ? '#16a34a' : s === 'REJEITADO' ? '#dc2626' : '#d97706';
        const bg = s === 'APROVADO' || s === 'PAGO' ? '#dcfce7' : s === 'REJEITADO' ? '#fee2e2' : '#fef3c7';
        return `<span style="background:${bg}; color:${cor}; padding:4px 12px; border-radius:30px; font-weight:700; font-size:0.75rem; border:1px solid ${cor};">${s}</span>`;
    };

    // 1. Taxa de Inscrição
    const taxaInscricaoValor = parseFloat(val.taxa_inscricao || 0);
    let htmlTaxaInscricao = '';
    if (taxaInscricaoValor > 0) {
        const inscJson = insc.inscricao_json || {};
        const compInsc = inscJson.comprovativo || '';
        const statusInsc = inscJson.status || 'PENDENTE';
        
        htmlTaxaInscricao = `
            <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong><i class="ri-file-text-line" style="color:#2563eb;"></i> Taxa de Inscrição (${taxaInscricaoValor.toFixed(2)} MT)</strong>
                    ${formatarStatusBadge(statusInsc)}
                </div>
                ${compInsc ? `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="background:#fff; padding:10px; border-radius:30px; border:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                            <small style="color:#475569;"><i class="ri-time-line"></i> Submetido: ${inscJson.data_submissao ? new Date(inscJson.data_submissao).toLocaleString() : 'N/A'}</small>
                            <button type="button" onclick="abrirImagemTelaCheia('${compInsc}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                                <i class="ri-eye-line"></i> Ver Comprovativo
                            </button>
                        </div>
                        <div style="text-align:center; background:#000; border-radius:30px; overflow:hidden; padding:6px;">
                            <img src="${compInsc}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Inscrição" style="max-height:160px; width:auto; border-radius:24px; cursor:pointer; object-fit:contain; display:block; margin:0 auto;" onclick="abrirImagemTelaCheia('${compInsc}')" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Erro+ao+Carregar+Imagem';">
                        </div>
                    </div>
                ` : '<small style="color:#94a3b8; display:block;"><i class="ri-information-line"></i> Nenhum comprovativo submetido.</small>'}
                
                ${statusInsc === 'EM_VERIFICACAO' ? `
                    <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_inscricao', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-check-line"></i> Aprovar Taxa
                        </button>
                        <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_inscricao', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-close-line"></i> Rejeitar
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 2. Prestações
    const htmlPrestacoes = (insc.mensalidades_json || []).map(m => `
        <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong><i class="ri-calendar-check-line" style="color:#2563eb;"></i> Prestação ${m.n_prestacao} - ${m.valor} MT</strong>
                ${formatarStatusBadge(m.status)}
            </div>
            ${m.comprovativo ? `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="background:#fff; padding:10px; border-radius:30px; border:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                        <small style="color:#475569;"><i class="ri-time-line"></i> Submetido: ${m.data_pagamento ? new Date(m.data_pagamento).toLocaleString() : 'N/A'}</small>
                        <button type="button" onclick="abrirImagemTelaCheia('${m.comprovativo}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                            <i class="ri-eye-line"></i> Ver Comprovativo
                        </button>
                    </div>
                    <div style="text-align:center; background:#000; border-radius:30px; overflow:hidden; padding:6px;">
                        <img src="${m.comprovativo}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Prestação" style="max-height:160px; width:auto; border-radius:24px; cursor:pointer; object-fit:contain; display:block; margin:0 auto;" onclick="abrirImagemTelaCheia('${m.comprovativo}')" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Erro+ao+Carregar+Imagem';">
                    </div>
                </div>
            ` : '<small style="color:#94a3b8; display:block;"><i class="ri-information-line"></i> Sem comprovativo anexado.</small>'}
            
            ${m.status === 'EM_VERIFICACAO' ? `
                <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                    <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'prestacao_${m.n_prestacao}', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                        <i class="ri-check-line"></i> Aprovar Prestação ${m.n_prestacao}
                    </button>
                    <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'prestacao_${m.n_prestacao}', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                        <i class="ri-close-line"></i> Rejeitar
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');

    // 3. Certificado
    const taxaCertificadoValor = parseFloat(val.taxa_certificado || 0);
    const certJson = insc.certificado_json || {};
    const compCert = certJson.comprovativo_taxa || '';
    const statusCert = certJson.taxa_paga ? 'PAGO' : (certJson.em_verificacao ? 'EM_VERIFICACAO' : 'PENDENTE');

    container.innerHTML = `
        <div class="detail-section">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;">
                <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:6px;">
                    <i class="ri-file-search-line" style="color:#2563eb;"></i> Inscrição #${insc.codigo_inscricao || 'N/A'}
                </h3>
                <span style="font-size:0.75rem; color:#16a34a; background:#dcfce7; padding:4px 10px; border-radius:30px; display:flex; align-items:center; gap:4px; font-weight:600;">
                    <i class="ri-flash-light-line"></i> Cache Ativo
                </span>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:30px; margin-bottom:15px; font-size:0.9rem; display:flex; flex-direction:column; gap:6px; border:1px solid #e2e8f0;">
                <p style="margin:0;"><strong><i class="ri-user-line"></i> Aluno:</strong> ${aluno.nome || 'N/A'} (${aluno.email || ''})</p>
                <p style="margin:0;"><strong><i class="ri-book-open-line"></i> Curso:</strong> ${curso.nome || 'N/A'}</p>
                <p style="margin:0;"><strong><i class="ri-user-star-line"></i> Coordenador:</strong> ${coord.nome || 'N/A'}</p>
                <p style="margin:0; display:flex; align-items:center; gap:8px;"><strong><i class="ri-shield-check-line"></i> Status Geral:</strong> ${formatarStatusBadge(insc.status)}</p>
            </div>

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">1. Taxa de Inscrição</h4>
            ${htmlTaxaInscricao || '<p style="font-size:0.85rem; color:#64748b;">Sem taxa aplicável.</p>'}

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">2. Prestações do Curso</h4>
            ${htmlPrestacoes || '<p style="font-size:0.85rem; color:#64748b;">Nenhuma prestação cadastrada.</p>'}

            <h4 style="margin:15px 0 8px 0; font-size:0.95rem; color:#1e293b;">3. Taxa de Certificado (${taxaCertificadoValor.toFixed(2)} MT)</h4>
            <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:30px; font-size:0.9rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span>Status:</span> ${formatarStatusBadge(statusCert)}
                </div>
                ${compCert ? `
                    <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
                        <button type="button" onclick="abrirImagemTelaCheia('${compCert}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:30px; cursor:pointer; font-size:0.75rem; font-weight:600; width:fit-content; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-eye-line"></i> Ver Comprovativo do Certificado
                        </button>
                        <div style="text-align:center; background:#000; border-radius:30px; overflow:hidden; padding:6px;">
                            <img src="${compCert}" crossorigin="anonymous" referrerpolicy="no-referrer" alt="Comprovativo Certificado" style="max-height:160px; width:auto; border-radius:24px; cursor:pointer; object-fit:contain; display:block; margin:0 auto;" onclick="abrirImagemTelaCheia('${compCert}')" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Erro+ao+Carregar+Imagem';">
                        </div>
                    </div>
                ` : '<small style="color:#94a3b8; display:block;">Sem comprovativo de certificado anexado.</small>'}
                
                ${statusCert === 'EM_VERIFICACAO' ? `
                    <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_certificado', 'APROVADO')" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-check-line"></i> Aprovar Certificado
                        </button>
                        <button type="button" onclick="processarAprovacaoFinanceira(${insc.id}, 'taxa_certificado', 'REJEITADO')" style="background:#dc2626; color:#fff; border:none; padding:8px 16px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <i class="ri-close-line"></i> Rejeitar
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}


async function abrirPainelFinanceiroOperador(inscricaoId) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
    const res = await fetch(`/api/cm/operador/inscricao/${inscricaoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados da inscrição.');

    const containerEsquerdo = document.getElementById('containerEsquerdoDetalhes') || document.getElementById('detalhesInscricaoContainer');
    if (!containerEsquerdo) {
      console.error('Container de detalhes não encontrado no DOM.');
      return;
    }

    renderizarHtmlInscricaoDetalhes(data, containerEsquerdo);
    
    const modal = document.getElementById('modalPainelFinanceiro') || document.getElementById('modalFinanceiro');
    if (modal) modal.style.display = 'flex';
  } catch (err) {
    console.error('Erro ao abrir painel financeiro:', err);
    alert(err.message || 'Erro ao carregar painel financeiro.');
  }
}



function abrirImagemTelaCheia(url) {
  let m = document.getElementById('modalZoomImg');
  if (!m) { document.body.insertAdjacentHTML('beforeend', `
      <div id="modalZoomImg" onclick="this.style.display='none'" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; justify-content:center; align-items:center; cursor:zoom-out; padding:20px;">
        <img id="imgZoomSrc" crossorigin="anonymous" referrerpolicy="no-referrer" style="max-width:90%; max-height:90%; border-radius:30px; object-fit:contain; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      </div>
    `); m = document.getElementById('modalZoomImg');
  }
  document.getElementById('imgZoomSrc').src = url; m.style.display = 'flex';
}



async function carregarTelaCarteiras() {
    const carteiras = await buscarCarteirasSeguro();
    const usuarioIdLogado = estadoGlobal?.usuarioLogadoId || 0;

    // Filtrar apenas as carteiras que pertencem ao usuário logado (fin_id === usuarioIdLogado) ou onde destinado_a === 'MEUS_CURSOS' / 'TODOS'
    // Conforme regra solicitada: "liste as que forem dele ou compartilhadas"
    const minhasCarteiras = carteiras.filter(c => c.fin_id === usuarioIdLogado);
    const compartilhadas = carteiras.filter(c => c.destinado_a === 'TODOS' || c.destinado_a === 'MEUS_CURSOS');

    // KPIs
    const saldoMinhas = minhasCarteiras.reduce((acc, c) => acc + parseFloat(c.saldo_total || 0), 0);
    const saldoTodos = compartilhadas.reduce((acc, c) => acc + parseFloat(c.saldo_total || 0), 0);
    const saldoGeral = carteiras.reduce((acc, c) => acc + parseFloat(c.saldo_total || 0), 0);

    document.getElementById('kpiSaldoMinhas').innerText = `${saldoMinhas.toFixed(2)} MT`;
    document.getElementById('kpiSaldoTodos').innerText = `${saldoTodos.toFixed(2)} MT`;
    document.getElementById('kpiTotalMinhas').innerText = minhasCarteiras.length;
    document.getElementById('kpiSaldoGeral').innerText = `${saldoGeral.toFixed(2)} MT`;

    // Gráfico de Transações (Contagem de pendentes, aprovadas, rejeitadas nas transacoes_json)
    let totalPendentes = 0, totalAprovadas = 0, totalRejeitadas = 0;
    carteiras.forEach(c => {
        (c.transacoes_json || []).forEach(tx => {
            if (tx.status === 'PENDENTE' || tx.status === 'EM_VERIFICACAO') totalPendentes++;
            else if (tx.status === 'APROVADO') totalAprovadas++;
            else if (tx.status === 'REJEITADO') totalRejeitadas++;
        });
    });

    const maxTx = Math.max(totalPendentes, totalAprovadas, totalRejeitadas, 1);
    document.getElementById('graficoTransacoesContainer').innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
            <span style="font-size:0.75rem; font-weight:600; color:#d97706; margin-bottom:4px;">${totalPendentes}</span>
            <div style="width:85%; background:#f59e0b; height:${(totalPendentes/maxTx)*100}%; min-height:8px; border-radius:6px 6px 0 0;"></div>
            <span style="font-size:0.7rem; color:#64748b; margin-top:6px;">Pendentes</span>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
            <span style="font-size:0.75rem; font-weight:600; color:#16a34a; margin-bottom:4px;">${totalAprovadas}</span>
            <div style="width:85%; background:#22c55e; height:${(totalAprovadas/maxTx)*100}%; min-height:8px; border-radius:6px 6px 0 0;"></div>
            <span style="font-size:0.7rem; color:#64748b; margin-top:6px;">Aprovadas</span>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
            <span style="font-size:0.75rem; font-weight:600; color:#dc2626; margin-bottom:4px;">${totalRejeitadas}</span>
            <div style="width:85%; background:#ef4444; height:${(totalRejeitadas/maxTx)*100}%; min-height:8px; border-radius:6px 6px 0 0;"></div>
            <span style="font-size:0.7rem; color:#64748b; margin-top:6px;">Rejeitadas</span>
        </div>
    `;

    // Tabela Responsiva
    const tbody = document.getElementById('tabelaCarteirasCorpo');
    tbody.innerHTML = carteiras.map(c => `
        <tr class="conta-tr" onclick='abrirDetalhesCarteira(${JSON.stringify(c)})' style="border-bottom: 1px solid #f1f5f9; transition:0.2s;">
            <td style="padding: 12px 10px;">
                <strong><i class="ri-bank-card-line" style="color:#2563eb;"></i> ${c.nome_banco}</strong><br>
                <small style="color:#64748b;">${c.numero_conta} (${c.titular})</small>
            </td>
            <td style="padding: 12px 10px;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${c.destinado_a}</span></td>
            <td style="padding: 12px 10px;">ID Fin: ${c.fin_id}</td>
            <td style="padding: 12px 10px; font-weight:600; color:#16a34a;">${parseFloat(c.saldo_total || 0).toFixed(2)} MT</td>
            <td style="padding: 12px 10px;"><span class="badge badge-${c.status}">${c.status}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Nenhuma carteira encontrada.</td></tr>';
}

function abrirModalNovaCarteira() {
    document.getElementById('modalNovaCarteira').style.display = 'flex';
}

async function salvarNovaCarteira(e) {
    e.preventDefault();
    const payload = {
        nome_banco: document.getElementById('novaBanco').value,
        titular: document.getElementById('novaTitular').value,
        numero_conta: document.getElementById('novaNumero').value,
        destinado_a: document.getElementById('novaDestinado').value
    };
    try {
        const t = localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token');
        const r = await fetch('/api/cm/dados/carteiras', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error('Erro ao criar carteira.');
        alert('Carteira criada com sucesso!');
        document.getElementById('modalNovaCarteira').style.display = 'none';
        carregarTelaCarteiras();
    } catch (err) { alert(err.message); }
}



function abrirDetalhesCarteira(c) {
    const txs = c.transacoes_json || [];
    const htmlTxs = txs.map(tx => {
        const statusTx = (tx.status || 'PENDENTE').toUpperCase();
        const corStatus = statusTx === 'APROVADO' || statusTx === 'PAGO' ? '#16a34a' : statusTx === 'REJEITADO' ? '#dc2626' : '#d97706';
        const bgStatus = statusTx === 'APROVADO' || statusTx === 'PAGO' ? '#dcfce7' : statusTx === 'REJEITADO' ? '#fee2e2' : '#fef3c7';
        
        const valorTx = parseFloat(tx.valor || tx.montante || 100.00).toFixed(2); // Ajuste padrão ou dinâmico
        const nomeConteudo = tx.conteudo || tx.tipo || tx.item || `Inscrição / Pagamento #${tx.inscricao_id}`;

        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:20px; border:1px solid #e2e8f0; border-radius:30px; margin-bottom:8px; background:#f8fafc;">
                <div>
                    <strong>${tx.tx_id || 'TX-N/D'}</strong> - ${nomeConteudo} (${valorTx} MT)<br>
                    <small style="color:#64748b;">Submetido em: ${tx.data_submissao ? new Date(tx.data_submissao).toLocaleString() : 'Data não informada'}</small>
                </div>
            </div>
        `;
    }).join('') || '<p style="color:#94a3b8; font-size:0.85rem; text-align:center;">Nenhuma transação registrada nesta carteira.</p>';

    const corCarteira = c.status === 'APROVADO' ? '#16a34a' : '#d97706';
    document.getElementById('conteudoDetalhesCarteira').innerHTML = `
        <div style="background:#f1f5f9; padding:20px; border-radius:30px; margin-bottom:15px;">
            <p style="margin:4px 0;"><strong>Banco:</strong> ${c.nome_banco}</p>
            <p style="margin:4px 0;"><strong>Titular:</strong> ${c.titular} (${c.numero_conta})</p>
            <p style="margin:4px 0;"><strong>Saldo Total Aprovado:</strong> ${parseFloat(c.saldo_total || 0).toFixed(2)} MT</p>
            <p style="margin:4px 0;"><strong>Destinado a:</strong> ${c.destinado_a}</p>
            <p style="margin:4px 0;"><strong>Regra de Aprovação:</strong> ${c.aprovacao_regras}</p>
            <p style="margin:4px 0;"><strong>Status da Carteira:</strong> <span style="color:${corCarteira}; font-weight:750;">${c.status}</span></p>
        </div>
        <h4 style="margin:15px 0 10px 0; color:#1e293b; font-size:1rem;">HISTÓRICO DE TRANSAÇÕES</h4>
        <div style="max-height:280px; overflow-y:auto; padding-right:5px;">${htmlTxs}</div>
    `;
    document.getElementById('modalDetalhesCarteira').style.display = 'flex';
}


async function confirmarEAprovarCurso(cursoId) {
    const dadosAprovacao = {
        curso_id: cursoId,
        taxa_inscricao: parseFloat(document.getElementById('inp-taxa-inscricao').value) || 0,
        taxa_certificado: parseFloat(document.getElementById('inp-taxa-certificado').value) || 0,
        num_prestacoes: parseInt(document.getElementById('inp-num-prestacoes').value) || 0,
        preco: parseFloat(document.getElementById('inp-preco').value) || 0
    };
    
    const confirmou = confirm("ATENÇÃO: As informações de preços e taxas não poderão ser alteradas após a aprovação!\n\nDeseja confirmar a aprovação do curso?");
    if (confirmou) {
        try {
            const response = await fetch('/api/cm/dados/cursos/definir-preco', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(dadosAprovacao)
            });
            const resData = await response.json();
            if (response.ok && resData.status) { alert('Preços definidos e curso ativado!'); location.reload(); }
            else alert(resData.mensagem || 'Erro ao atualizar.');
        } catch (e) { alert('Erro na conexão com o servidor.'); }
    }
}


async function processarAprovacaoFinanceira(inscId, item, acao) {
  const motivo = acao === 'REJEITADO' ? prompt('Insira o motivo da rejeição do comprovativo:') : null;
  if (acao === 'REJEITADO' && !motivo) return alert('O motivo da rejeição é obrigatório.');
  const res = await fetch('/api/cm/dados/operador/validar-pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token')}` }, body: JSON.stringify({ inscricao_id: inscId, item, status: acao, motivo_rejeicao: motivo }) });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Erro ao processar validação.');
  alert(`Sucesso! Pagamento de ${item} marcado como ${acao}.`); window.location.reload();
}



//****************************************************************** */
function reload() {
    atualizarCardsDashboard()
    carregarEExibirFinanceiro()
    carregarTelaCarteiras()
}

reload()