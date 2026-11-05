let isNavigating = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('sidebar-overlay')
    sidebar.classList.toggle('open')
    overlay.classList.toggle('open')
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
    if (window.innerWidth <= 768) {toggleSidebar()}
    setTimeout(() => {
        document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');
        const targetPage = document.getElementById(`page-${targetPageId}`);
        if (targetPage) targetPage.style.display = 'block'; isNavigating = false;
    }, 500)
}


(function verificarSuperAdminAuto() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return;
    const payloadJson = JSON.parse(atob(payloadBase64))
    const cargo = (payloadJson.code || payloadJson.type || '').toUpperCase().trim();
    if (cargo === 'SUPERADMIN') {
      renderizarTabelaUsuarios();
    }
  } catch (error) {
    console.warn('Falha ao decodificar token local:', error);
  }
})();


async function buscarUsuariosSuperAdmin() {
  const res = await fetch('/api/cm/dados/adm/usuarios', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  const data = await res.json();
  return res.ok ? (data.dados || data.usuarios || data) : (alert(data.mensagem || 'Erro na sessão'), null);
}


let cacheGlobalSuperadmin = null;
async function buscarDadosGlobaisSuperadmin() {
  if (cacheGlobalSuperadmin) return cacheGlobalSuperadmin;
  const res = await fetch('/api/cm/dados/superadmin/dados-globais', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('cm_token')}` } });
  cacheGlobalSuperadmin = await res.json();
  if (!res.ok) throw new Error(cacheGlobalSuperadmin.error || 'Erro.');
  return cacheGlobalSuperadmin;
}



async function renderizarGraficoTransacoes() {
  const data = await buscarDadosGlobaisSuperadmin();
  const w = data.carteiras || [];
  const ctx = document.getElementById('graficoTransacoesCarteiras').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: { labels: w.map(x => x.nome_banco), datasets: [{ label: 'Saldo (MZN)', data: w.map(x => parseFloat(x.saldo_total || 0)), backgroundColor: '#2563eb', borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}


const mapaCargos = {
  'SUPERADMIN': 'ADMINISTRADOR',
  'COO': 'COORDENAÇÃO (COO)',
  'FIN': 'FINANCEIRO (FIN)',
  'FOR': 'FORMADOR (FOR)',
  'SEC': 'SECRETARIA (SEC)',
  'MKT': 'MARKETING (MKT)',
  'ALU': 'FORMANDO (ALU)'
}


let cacheUsuarios = []
async function renderizarTabelaUsuarios() {
  cacheUsuarios = await buscarUsuariosSuperAdmin()
  const tbody = document.getElementById('tbody-usuarios')
  if (!cacheUsuarios || !tbody) return
  montarLinhasTabela(cacheUsuarios)
}

function montarLinhasTabela(lista) {
  const tbody = document.getElementById('tbody-usuarios'); tbody.innerHTML = '';
  const filtrados = lista.filter(u => u.codigo !== 'ALU');
  document.getElementById('numeroDeUsuarios').innerText = filtrados.length;
  filtrados.forEach(user => {
    const ativo = user.status === 'activo' || user.status === 'ativo';
    tbody.innerHTML += `<tr><td>#${user.id}</td><td>${user.nome || 'N/A'}</td><td>${user.email || 'N/A'}</td><td><span class="role-badge">${mapaCargos[user.codigo] || user.codigo || 'SEM CARGO'}</span></td><td><button onclick="alternarStatusAPI(${user.id}, '${user.status}')" class="status-btn" style="background:${ativo?'#DCFCE7':'#FEE2E2'};color:${ativo?'#15803D':'#B91C1C'}">${user.status || 'inativo'}</button></td><td style="text-align:center"><button class="btn-more-info" onclick="abrirDetalhesUsuario(${user.id})"><i class="ri-add-line"></i></button></td></tr>`;
  });
}

function filtrarTabelaUsuarios() {
  const termo = document.getElementById('input-search-table').value.toLowerCase();
  const filtrados = cacheUsuarios.filter(u => (u.nome && u.nome.toLowerCase().includes(termo)) || (u.email && u.email.toLowerCase().includes(termo)));montarLinhasTabela(filtrados);
}


async function abrirDetalhesUsuario(id) {
  const data = await buscarDadosGlobaisSuperadmin();
  const u = (data.usuarios || []).find(x => x.id === id); if (!u) return;
  const coos = (data.usuarios || []).filter(x => x.codigo === 'COO');
  const forVinculados = (data.usuarios || []).filter(x => x.codigo === 'FOR' && String(x.ref) === String(u.id));
  const isFor = u.codigo === 'FOR', isCoo = u.codigo === 'COO', isSuper = u.codigo === 'SUPERADMIN' || u.codigo === 'SUPERA';
  const cooPai = coos.find(x => String(x.id) === String(u.ref));
  
  document.getElementById('modal-nome-usuario').innerText = u.nome || 'Utilizador';
  document.getElementById('modal-body-conteudo').innerHTML = `
    <div style="background:#f8fafc;padding:16px;border-radius:20px;display:flex;align-items:center;gap:14px;margin-bottom:16px;border:1px solid #e2e8f0;">
      <div style="width:48px;height:48px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;">${(u.nome||'U').charAt(0)}</div>
      <div><h4 style="margin:0;color:#0f172a;font-size:1rem;">${u.nome}</h4><span style="font-size:0.75rem;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-weight:600;">${u.codigo || 'SEM CARGO'}</span></div>
    </div>
    <div style="font-size:0.85rem;color:#475569;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${isSuper?'0':'16px'};">
      <div><b>CELULAR:</b> ${u.celular || 'N/A'}</div><div><b>EMAIL:</b> ${u.email || 'N/A'}</div>
      ${isFor ? `<div style="grid-column:1/-1;"><b>COORDENAÇÃO ATUAL:</b> ${cooPai ? cooPai.nome : '<span style="color:#b91c1c;">Não vinculado</span>'}</div>` : ''}
      ${isCoo ? `<div><b>FORMADORES ATRIBUÍDOS:</b> ${forVinculados.length}</div>` : ''}
    </div>
    ${isFor && !u.ref ? `<div style="margin-bottom:16px;background:#fef2f2;padding:12px;border-radius:12px;border:1px solid #fca5a5;"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:6px;color:#991b1b;">ATRIBUIR A UMA COORDENAÇÃO:</label><div style="display:flex;gap:8px;"><select id="sel-coo-${u.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:0.8rem;"><option value="">Selecione...</option>${coos.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select><button onclick="atribuirCoordenacaoAPI(${u.id})" style="background:#16a34a;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">VINCULAR</button></div></div>` : ''}
    ${!isSuper ? `<div style="border-top:1px solid #e2e8f0;padding-top:14px;"><h4 style="margin:0 0 10px 0;font-size:0.9rem;color:#0f172a;"><i class="ri-settings-4-line"></i> GESTÃO DE ESTADO E CARGO</h4>
      <div style="display:flex;gap:8px;margin-bottom:10px;"><select id="adm-status-${u.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #cbd5e1;">${['activo','suspenso','arquivado','bloqueado'].map(s=>`<option value="${s}" ${u.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}</select><button onclick="salvarAcaoAdm(${u.id},'status')" style="background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">STATUS</button></div>
      <div style="display:flex;gap:8px;"><select id="adm-cargo-${u.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #cbd5e1;">${['COO','FIN','FOR','SEC','MKT'].map(c=>`<option value="${c}" ${u.codigo===c?'selected':''}>${c}</option>`).join('')}</select><button onclick="salvarAcaoAdm(${u.id},'cargo')" style="background:#0d9488;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">CARGO</button></div></div>` : ''}`;
  document.getElementById('modal-usuario-detalhes').style.display = 'flex';
}

async function atribuirCoordenacaoAPI(forId) {
  const cooId = document.getElementById(`sel-coo-${forId}`).value;
  if (!cooId) return alert('Selecione uma coordenação.');
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/cm/dados/${forId}/vincular-coordenacao`, { 
    method: 'PATCH', 
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
    body: JSON.stringify({ ref: cooId }) 
  }); const data = await res.json();
  if (res.ok) { cacheGlobalSuperadmin = null; abrirDetalhesUsuario(forId); } else { alert(data.mensagem || 'Erro ao atribuir coordenação.'); }
}


async function salvarAcaoAdm(id, tipo) {
  const val = document.getElementById(`adm-${tipo}-${id}`).value;
  const data = await buscarDadosGlobaisSuperadmin();
  const u = (data.usuarios || []).find(x => x.id === id);
  if (tipo === 'cargo' && u && u.codigo === 'FOR' && u.ref) {
    alert('Erro: Este formador possui uma coordenação vinculada e atividades na plataforma. Alterar o cargo pode corromper o progresso e os vínculos ativos.');
    return;
  }if (tipo === 'cargo' && !confirm(`Tem certeza que pretende atribuir o cargo ${val} a este funcionário?`)) return;
  const res = await fetch(`/api/cm/dados/adm/usuarios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(tipo === 'status' ? { status: val } : { codigo: val }) });
  const d = await res.json(); alert(d.mensagem); if (res.ok) location.reload();
}


function fecharModalDetalhes() {
  document.getElementById('modal-usuario-detalhes').style.display = 'none';
}


async function renderizarEstatisticasSuperadmin() {
  const data = await buscarDadosGlobaisSuperadmin();
  const receita = (data.carteiras || []).reduce((acc, c) => acc + parseFloat(c.saldo_total || 0), 0);
  const pendentes = (data.inscricoes || []).filter(i => i.status === 'PENDENTE' || i.inscricao_json?.status === 'EM_VERIFICACAO').length;
  document.getElementById('stat-receita-total').textContent = `MZN ${receita.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-usuarios-ativos').textContent = (data.usuarios || []).filter(u => u.status === 'activo').length;
  document.getElementById('stat-pendentes').textContent = pendentes;
  document.getElementById('stat-taxa-conversao').textContent = data.usuarios?.length ? `${Math.round(((data.inscricoes?.length || 0) / data.usuarios.length) * 100)}%` : '0%';
}


async function carregarPainelRelatoriosGlobais() {
    try {
        const data = await buscarDadosGlobaisSuperadmin();
        const usuarios = data.usuarios || [], cursos = data.cursos || [], inscricoes = data.inscricoes || [];
        
        const alunos = usuarios.filter(u => u.codigo === 'ALU');
        document.getElementById('kpi-total-alunos').textContent = alunos.length;
        document.getElementById('kpi-total-cursos').textContent = cursos.length;
        document.getElementById('kpi-total-pendentes').textContent = inscricoes.filter(i => i.status === 'PENDENTE' || i.inscricao_json?.status === 'EM_VERIFICACAO').length;

        const cooMap = new Map(usuarios.filter(u => u.codigo === 'COO').map(c => [c.id, c.nome]));
        const cursoMap = new Map(cursos.map(c => [c.id, c]));
        const inscricoesPorAluno = inscricoes.reduce((acc, insc) => {
            if (!acc[insc.aluno_id]) acc[insc.aluno_id] = [];
            acc[insc.aluno_id].push(insc);
            return acc;
        }, {});

        const tbody = document.getElementById('tabela-relatorio-detalhado');
        if (alunos.length === 0) return tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Nenhum aluno registado.</td></tr>`;

        tbody.innerHTML = alunos.map(aluno => {
            const minhasInscricoes = inscricoesPorAluno[aluno.id] || [];
            const avatarUrl = aluno.foto_url || 'https://via.placeholder.com/40?text=' + encodeURIComponent(aluno.nome.charAt(0));
            const statusVerificacao = aluno.perfil_json?.verificacao?.status || (aluno.email_verificado ? 'verificado' : 'pendente');

            let htmlCursos = '<div style="color:#94a3b8; font-style:italic;">Nenhum curso</div>';
            let htmlCoo = '<div style="color:#94a3b8;">-</div>';
            let htmlStatus = `<div style="color:#b45309;">${statusVerificacao}</div>`;
            let htmlMensalidades = '<div style="color:#94a3b8;">-</div>';
            let htmlDesempenho = '<div style="color:#94a3b8;">-</div>';
            let htmlCert = '<div style="color:#94a3b8;">-</div>';

            if (minhasInscricoes.length > 0) {
                htmlCursos = minhasInscricoes.map(insc => {
                    const c = cursoMap.get(insc.curso_id) || {};
                    return `<div style="padding:4px 0; border-bottom:1px dashed #f1f5f9; font-size: 8pt; font-weight:600; color:#0f172a;">• ${c.nome || 'Curso Indefinido'}</div>`;
                }).join('');

                htmlCoo = minhasInscricoes.map(insc => {
                    const c = cursoMap.get(insc.curso_id) || {};
                    const nomeCoo = cooMap.get(c.coo_id) || 'Geral';
                    return `<div style="padding:4px 0; border-bottom:1px dashed #f1f5f9;"><span style="background:#e0f2fe; color:#0369a1; padding:4px 6px; border-radius:30px; font-size:0.75rem;">${nomeCoo}</span></div>`;
                }).join('');

                htmlStatus = minhasInscricoes.map(insc => {
                    return `<div style="padding:4px 0; border-bottom:1px dashed #f1f5f9;"><span style="background:#fef3c7; color:#b45309; padding:4px 6px; border-radius:30px; font-size:0.75rem;">${insc.status}</span></div>`;
                }).join('');

                htmlMensalidades = minhasInscricoes.map(insc => {
                    const m = insc.mensalidades_json || [];
                    const pagas = m.filter(x => x.status === 'PAGO').length;
                    return `<div style="padding:4px 0; border-bottom:1px dashed #f1f5f9; font-size:0.8rem;">${pagas}/${m.length} Pagas</div>`;
                }).join('');

                htmlDesempenho = minhasInscricoes.map(insc => {
                    const prog = insc.desempenho_json?.progresso_porcentagem || 0;
                    return `<div style="padding:6px 0; border-bottom:1px dashed #f1f5f9;"><div style="font-size:0.75rem;">${prog}%</div><div style="width:70px; background:#e2e8f0; height:5px; border-radius:3px; overflow:hidden;"><div style="background:#2563eb; width:${prog}%; height:100%;"></div></div></div>`;
                }).join('');

                htmlCert = minhasInscricoes.map(insc => {
                    const cert = insc.certificado_json || {};
                    const txt = cert.apto_para_levantar ? 'Emitido' : (cert.taxa_paga ? 'Taxa Paga' : 'Não Solicitado');
                    return `<div style="padding:4px 0; border-bottom:1px dashed #f1f5f9; font-size:0.75rem; color:#475569;">${txt}</div>`;
                }).join('');
            }

            return `
                <tr onclick="abrirDetalhesAluno(${aluno.id})" style="border-bottom:1px solid #e2e8f0; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:14px; display:flex; align-items:center; gap:10px;">
                        <img src="${avatarUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e1;" onerror="this.src='https://via.placeholder.com/36'">
                        <div><strong>${aluno.nome}</strong><br><small style="color:#64748b;">${aluno.email} | Tel: ${aluno.celular || 'N/A'}</small></div>
                    </td>
                    <td style="padding:14px;">${htmlCursos}</td>
                    <td style="padding:14px;">${htmlCoo}</td>
                    <td style="padding:14px;">${htmlStatus}</td>
                    <td style="padding:14px;">${htmlMensalidades}</td>
                    <td style="padding:14px;">${htmlDesempenho}</td>
                    <td style="padding:14px;">${htmlCert}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Erro ao carregar relatórios detalhados:", err);
    }
}





async function exportarWorkbookCompleto() {
  const data = await buscarDadosGlobaisSuperadmin();
  const f = (data.usuarios || []).filter(u => u.codigo !== 'ALU').map(u => ({ ID: u.id, Nome: u.nome, Email: u.email, Cargo: u.codigo, Status: u.status }));
  const a = (data.usuarios || []).filter(u => u.codigo === 'ALU').map(x => ({ ID: x.id, Nome: x.nome, Email: x.email, Celular: x.celular }));
  const c = (data.cursos || []).map(x => ({ ID: x.id, Nome: x.nome, Área: x.area, Preço: x.preco }));
  const w = (data.carteiras || []).map(x => ({ ID: x.id, Banco: x.nome_banco, Titular: x.titular, Saldo: x.saldo_total }));
  const wb = XLSX.utils.book_new();
  [[c, 'Cursos'], [a, 'Alunos'], [f, 'Funcionários'], [w, 'Carteiras']].forEach(([d, n]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), n));
  XLSX.writeFile(wb, 'CM_CETROPROHC_Relatorio_Consolidado.xlsx');
}

async function executarBackupCompletoJSON() {
  const data = await buscarDadosGlobaisSuperadmin();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_completo.json'; a.click();
}


async function carregarPaginaCarteiras() {
  const data = await buscarDadosGlobaisSuperadmin();
  const w = data.carteiras || [], i = data.inscricoes || [];
  document.getElementById('card-saldo-total').textContent = `MZN ${w.reduce((a, x) => a + parseFloat(x.saldo_total || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2})}`;
  document.getElementById('card-projecao-receita').textContent = `MZN ${i.reduce((a, x) => a + parseFloat(x.valor_actual?.preco_curso || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2})}`;
  document.getElementById('card-carteiras-pendentes').textContent = w.filter(x => x.status !== 'APROVADO').length;
  document.getElementById('tabela-carteiras-financeiro').innerHTML = w.map(x => { const ap = x.status === 'APROVADO'; return `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px;"><strong>${x.nome_banco}</strong></td><td style="padding:12px;">${x.titular}</td><td style="padding:12px;">${x.numero_conta}</td><td style="padding:12px;">MZN ${parseFloat(x.saldo_total||0).toFixed(2)}</td><td style="padding:12px;"><span style="background:${ap?'#DCFCE7':'#FEE2E2'};color:${ap?'#15803D':'#B91C1C'};padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;">${x.status}</span></td><td style="padding:12px; text-align:center;"><button onclick="toggleCarteiraAPI(${x.id}, '${x.status}')" style="background:${ap?'#B91C1C':'#16a34a'};color:#fff;border:none;padding:6px 12px;border-radius:30px;cursor:pointer;font-weight:600;">${ap?'BLOQUEAR':'APROVAR'}</button></td></tr>`; }).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;">Sem carteiras.</td></tr>';
  document.getElementById('tabela-mensalidades-financeiro').innerHTML = i.map(x => `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px;"><strong>#${x.codigo_inscricao}</strong></td><td style="padding:12px;">ID ${x.aluno_id}</td><td style="padding:12px;">Curso ID ${x.curso_id}</td><td style="padding:12px;"><span style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:6px;font-size:0.75rem;">${x.status}</span></td><td style="padding:12px;">${(x.mensalidades_json || []).filter(m => m.status === 'PAGO').length}/${(x.mensalidades_json || []).length} Pagas</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;">Sem inscrições.</td></tr>';
}


async function toggleCarteiraAPI(id, statusAtual) {
  const acao = statusAtual === 'APROVADO' ? 'bloquear' : 'aprovar';
  const res = await fetch(`/api/cm/dados/carteiras/${id}/${acao}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('cm_token')}` } });
  if (res.ok) { cacheGlobalSuperadmin = null; carregarPaginaCarteiras(); } else alert('Erro ao alterar estado da carteira.');
}




//************************************************************* */
function reload(){
  renderizarEstatisticasSuperadmin()
  carregarPainelRelatoriosGlobais()
  renderizarGraficoTransacoes()
  carregarPaginaCarteiras()
}
reload()