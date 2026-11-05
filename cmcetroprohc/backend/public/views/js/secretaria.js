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

    if (window.innerWidth <= 768) {
        toggleSidebar();
    }

    setTimeout(() => {
        document.querySelectorAll('.page-view').forEach(page => page.style.display = 'none');

        const targetPage = document.getElementById(`page-${targetPageId}`);
        if (targetPage) targetPage.style.display = 'block';

        isNavigating = false;
    }, 1000);
}


async function buscarAlunosSecretaria() {
  const token = localStorage.getItem('token') || '';
  const res = await fetch('/api/cm/dados/secretaria/alunos', { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.json()).error || 'Erro ao carregar alunos');
  return await res.json()
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



function filtrarTabelaUsuarios() {
  const input = document.getElementById('input-search-table');
  const termo = input ? input.value.toLowerCase().trim() : '';
  const todosAlunos = window.__alunosCache || [];
  if (!termo) {renderizarTabelaFiltrada(todosAlunos); return}
    const alunosFiltrados = todosAlunos.filter(aluno => { const nome = (aluno.nome || '').toLowerCase();
    const email = (aluno.email || '').toLowerCase(); const status = (aluno.perfil_json?.verificacao?.status || 'pendente').toLowerCase();
    return nome.includes(termo) || email.includes(termo) || status.includes(termo);
  })
 renderizarTabelaFiltrada(alunosFiltrados);
}


function renderizarTabelaFiltrada(listaAlunos) {
  const tbody = document.getElementById('tbody-formandos');
  const spanContador = document.getElementById('numeroDeCordenadores');
  if (spanContador) {spanContador.textContent = `"${listaAlunos.length}"`;}
  if (!tbody) return;
  if (listaAlunos.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#6b7280;">Nenhum aluno encontrado para esta pesquisa.</td></tr>'; return; }

  const statusMap = {
    aprovado: { label: 'Aprovado', bg: '#dcfce7', text: '#15803d' },
    em_analise: { label: 'Em Análise', bg: '#fef3c7', text: '#b45309' },
    rejeitado: { label: 'Rejeitado', bg: '#fee2e2', text: '#b91c1c' },
    pendente: { label: 'Incompleto', bg: '#f3f4f6', text: '#4b5563' }
  };

  tbody.innerHTML = listaAlunos.map((aluno, idx) => {const stKey = aluno.perfil_json?.verificacao?.status || 'pendente'; const st = statusMap[stKey] || statusMap.pendente;
    return `
      <tr><td><strong>${idx + 1}</strong></td>
        <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-weight:600; color:#111827;">${aluno.nome || 'Sem nome'}</span></div></td>
        <td style="color:#4b5563;">${aluno.email || '-'}</td>
        <td><span style="background:${st.bg}; color:${st.text}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; display:inline-block;">${st.label}</span></td>
        <td style="text-align: center;"><button onclick="abrirModalAluno(${aluno.id})" title="Ver ficha completa" style="border:none; background:#eff6ff; color:#2563eb; width:36px; height:36px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.2s;"><i class="ri-file-user-line" style="font-size:18px;"></i> </button></td>
      </tr>`
  }).join('')
}


async function carregarETabelaAlunos() {
  const tbody = document.getElementById('tbody-formandos');
  if (!tbody) return;
  try { const alunos = await buscarAlunosSecretaria(); window.__alunosCache = alunos || [];
    window.__alunosCache = alunos || []; filtrarTabelaUsuarios(); 
    if (!Array.isArray(alunos) || alunos.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#6b7280;">Nenhum aluno cadastrado no momento.</td></tr>'; return;}
    const statusMap = {
      aprovado: { label: 'Aprovado', bg: '#dcfce7', text: '#15803d' },
      em_analise: { label: 'Em Análise', bg: '#fef3c7', text: '#b45309' },
      rejeitado: { label: 'Rejeitado', bg: '#fee2e2', text: '#b91c1c' },
      pendente: { label: 'Incompleto', bg: '#f3f4f6', text: '#4b5563' }
    };

    tbody.innerHTML = alunos.map((aluno, idx) => { const stKey = aluno.perfil_json?.verificacao?.status || 'pendente';  const st = statusMap[stKey] || statusMap.pendente;

      return `
        <tr><td><strong>${idx + 1}</strong></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-weight:600; color:#111827;">${aluno.nome || 'Sem nome'}</span></div></td>
          <td style="color:#4b5563;">${aluno.email || '-'}</td>
          <td><span style="background:${st.bg}; color:${st.text}; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; display:inline-block;">${st.label}</span></td>
          <td style="text-align: center;"><button onclick="abrirModalAluno(${aluno.id})" title="Ver ficha completa" style="border:none; background:#eff6ff; color:#2563eb; width:36px; height:36px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.2s;"> <i class="ri-file-user-line" style="font-size:18px;"></i></button></td>
        </tr>`
    }).join('')
  } catch (err) {tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Erro ao carregar dados: ${err.message}</td></tr>`;}
}

function abrirModalAluno(id) {
  const aluno = (window.__alunosCache || []).find(a => a.id === id);if (!aluno) return; const p = aluno.perfil_json || {}; const v = p.verificacao || {};
  const formatUrl = url => { if (!url) return '';
    if (url.includes('drive.google.com')) { const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/); return match && match[1] ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;} return url;
  };
  let modal = document.getElementById('modal-detalhes-aluno'); if (modal) modal.remove();
  modal = document.createElement('div'); modal.id = 'modal-detalhes-aluno'; modal.style.cssText = 'position:fixed; inset:0; background:rgba(15, 23, 42, 0.65); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; animation:fadeIn 0.2s ease-out;'; const avatar = formatUrl(aluno.foto_url);
  modal.innerHTML = `
    <div style="background:#ffffff; border-radius:30px; max-width:720px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow:hidden; font-family:'Poppins', sans-serif;">
      
      <div style="background:#f8fafc; padding:20px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="background:#3b82f6; color:#fff; width:40px; height:40px; border-radius:10px; display:grid; place-items:center; font-size:20px;">
            <i class="ri-id-card-line"></i>
          </div>
          <div>
            <h3 style="margin:0; font-size:18px; font-weight:700; color:#0f172a;">FICHA ACADEMICA DO ALUNO</h3>
            <span style="font-size:12px; color:#64748b;">Código: <strong>${aluno.codigo || 'ALU'}-${aluno.id}</strong> | UUID: ${aluno.uuid ? aluno.uuid.slice(0,8) : '-'}...</span>
          </div>
        </div>
        <button onclick="document.getElementById('modal-detalhes-aluno').remove()" style="border:none; background:#e2e8f0; color:#475569; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:18px; display:grid; place-items:center;">&times;</button>
      </div>

      <!-- Corpo da Ficha -->
      <div style="padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:20px;">
        
        <!-- Bloco Principal Perfil -->
        <div style="display:flex; gap:16px; align-items:center; background:#f1f5f9; padding:16px; border-radius:12px;">
          <div style="position:relative;">
            ${avatar ? `<img src="${avatar}" crossorigin="anonymous" referrerpolicy="no-referrer" onclick="ampliarImagem('${avatar}')" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #fff; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); cursor:pointer;" />` 
                   : `<div style="width:72px; height:72px; border-radius:50%; background:#cbd5e1; color:#334155; display:grid; place-items:center; font-weight:700; font-size:22px;">${aluno.nome ? aluno.nome.charAt(0) : 'A'}</div>`}
          </div>
          <div style="flex:1;">
            <h4 style="margin:0 0 4px 0; font-size:16px; color:#0f172a;">${aluno.nome || 'Não informado'}</h4>
            <div style="display:flex; flex-wrap:wrap; gap:12px; font-size:13px; color:#475569;">
              <span><i class="ri-mail-line"></i> ${aluno.email || '-'}</span>
              <span><i class="ri-phone-line"></i> ${aluno.celular || '-'}</span>
              <span><i class="ri-whatsapp-line"></i> ${p.whatsapp || aluno.celular || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Seções de Informações -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
          
          <!-- Identificação Pessoal -->
          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <h5 style="margin:0 0 12px 0; color:#2563eb; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ri-user-3-line"></i> DADOS PESSOAIS</h5>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; color:#334155;">
              <div><strong>Gênero:</strong> ${aluno.genero || '-'}</div>
              <div><strong>Data Nasc:</strong> ${aluno.data_nascimento || '-'}</div>
              <div><strong>Estado Civil:</strong> ${p.estado_civil || '-'}</div>
              <div><strong>Nacionalidade:</strong> ${p.nacionalidade || '-'}</div>
              <div><strong>Pai:</strong> ${p.nome_pai || '-'}</div>
              <div><strong>Mãe:</strong> ${p.nome_mae || '-'}</div>
            </div>
          </div>

          <!-- Documentação e Endereço -->
          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <h5 style="margin:0 0 12px 0; color:#2563eb; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ri-file-paper-2-line"></i> DOCUMENTOS & MORADIA</h5>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; color:#334155;">
              <div><strong>${p.doc_tipo || 'Doc'}:</strong> ${p.doc_numero || '-'}</div>
              <div><strong>NUIT:</strong> ${p.nuit || '-'}</div>
              <div><strong>Emissão:</strong> ${p.doc_emissao || '-'}</div>
              <div><strong>Validade:</strong> ${p.doc_validade || '-'}</div>
              <div><strong>Província/Dist.:</strong> ${p.provincia || '-'}/${p.distrito || '-'}</div>
              <div><strong>Bairro/Rua:</strong> ${p.bairro || '-'}, ${p.rua || '-'}</div>
            </div>
          </div>

          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; grid-column: 1 / -1;">
            <h5 style="margin:0 0 12px 0; color:#2563eb; font-size:14px; display:flex; align-items:center; gap:6px;"><i class="ri-book-read-line"></i> FORMAÇÃO & ENCARREGADO</h5>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px; color:#334155;">
              <div><strong>Escolaridade:</strong> ${p.escolaridade || '-'}</div>
              <div><strong>Escola Anterior:</strong> ${p.escola_anterior || '-'}</div>
              <div><strong>Ano Conclusão:</strong> ${p.ano_conclusao || '-'}</div>
              <div><strong>Encarregado:</strong> ${p.encarregado_nome || '-'} (${p.encarregado_telefone || '-'})</div>
            </div>
          </div>

        </div>

        <div style="border-top:1px solid #f1f5f9; padding-top:12px;">
          <h5 style="margin:0 0 12px 0; color:#0f172a; font-size:14px;"><i class="ri-image-line"></i> DOCUMENTOS ANEXADOS</h5>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
            ${p.doc_frente ? criarCardImagem('Doc. Frente', formatUrl(p.doc_frente)) : ''}
            ${p.doc_verso ? criarCardImagem('Doc. Verso', formatUrl(p.doc_verso)) : ''}
            ${p.certificado_doc ? criarCardImagem('Certificado', formatUrl(p.certificado_doc)) : ''}
            ${(!p.doc_frente && !p.doc_verso && !p.certificado_doc) ? '<small style="color:#94a3b8;">Nenhum documento anexado.</small>' : ''}
          </div>
        </div>

      </div>

      <!-- Rodapé de Ações de Verificação -->
      <div style="background:#f8fafc; padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <small style="display:block; color:#64748b; font-size:11px;">STATUS ATUAL DA VERIFICAÇÃO</small>
          <strong style="color:#0f172a; text-transform:uppercase; font-size:13px;">${v.status || 'pendente'}</strong>
        </div>

        <div style="display:flex; gap:10px;">
          <button onclick="alterarStatusAluno(${aluno.id}, 'rejeitado')" style="background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ri-close-circle-line"></i> Rejeitar
          </button>
          <button onclick="alterarStatusAluno(${aluno.id}, 'em_analise')" style="background:#f59e0b; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ri-time-line"></i> Em Análise
          </button>
          <button onclick="alterarStatusAluno(${aluno.id}, 'aprovado')" style="background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <i class="ri-checkbox-circle-line"></i> Aprovar
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);
}

function criarCardImagem(label, url) {
  return `
    <div onclick="ampliarImagem('${url}')" style="border:1px solid #cbd5e1; border-radius:8px; padding:6px; background:#fff; cursor:pointer; text-align:center; transition:0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#cbd5e1'">
      <img src="${url}" crossorigin="anonymous" referrerpolicy="no-referrer" style="width:100%; height:80px; object-fit:cover; border-radius:6px;" />
      <span style="font-size:11px; font-weight:600; color:#475569; display:block; margin-top:4px;">${label}</span>
    </div>
  `;
}

function ampliarImagem(url) {
  let lightbox = document.getElementById('lightbox-fullscreen'); if (lightbox) lightbox.remove(); lightbox = document.createElement('div'); lightbox.id = 'lightbox-fullscreen';
  lightbox.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:100000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.15s ease-out;';
  lightbox.innerHTML = `<button onclick="document.getElementById('lightbox-fullscreen').remove()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.2); border:none; color:#fff; width:44px; height:44px; border-radius:50%; font-size:24px; cursor:pointer; display:grid; place-items:center;">&times;</button><img src="${url}" crossorigin="anonymous" referrerpolicy="no-referrer" style="max-width:95vw; max-height:92vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" />`; document.body.appendChild(lightbox);
}




async function alterarStatusAluno(id, novoStatus) {
  if (!confirm(`Deseja alterar o status de verificação para "${novoStatus.toUpperCase()}"?`)) return;
  try { toggleLoader('loader');
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/cm/dados/secretaria/alunos/${id}/status`, {method: 'PATCH', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: novoStatus })});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status');
    const modal = document.getElementById('modal-detalhes-aluno')
    if (modal) modal.remove(); await carregarETabelaAlunos()
    abrirModalAluno(id);
  } catch (err) {alert('Erro: ' + err.message)} finally {toggleLoader('stop')}
}


async function atualizarCardsDashboard() {
  const alunos = window.__alunosCache || await buscarAlunosSecretaria();
  const getCount = (st) => alunos.filter(a => (a.perfil_json?.verificacao?.status || 'pendente') === st).length;
  document.getElementById('card-total-alunos').textContent = alunos.length;
  document.getElementById('card-alunos-aprovados').textContent = getCount('aprovado');
  document.getElementById('card-alunos-analise').textContent = getCount('em_analise');
  document.getElementById('card-alunos-pendentes').textContent = alunos.length - getCount('aprovado') - getCount('em_analise');
}






//****************************************** */
function reload(){
    carregarETabelaAlunos()
    atualizarCardsDashboard()
}
reload()