const express = require('express')
const router = express.Router()
const sharp = require('sharp')
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken")
const { Op } = require('sequelize')
crypto = require('crypto')

const { getUsuarioModel, usuarioPromise } = require('../models/usuarios');
const { getTurmaModel, turmaPromise } = require('../models/turmas');
const { getCursoModel, cursoPromise } = require('../models/cursos');
const { getTurmaConteudoModel, turmaConteudoPromise } = require('../models/turma_conteudos');
const { getInscricaoModel, inscricaoPromise } = require('../models/inscricoes');
const { getCarteiraPagamentoModel, carteiraPagamentoPromise } = require('../models/carteiras');


const authMiddleware = require("../middleware/authentication")
const e = require('express')


const upImg = async i => {
  if (!i || typeof i !== "string") return ""
  if (i.startsWith("http")) return i
  const clean = i.includes(",") ? i.split(",")[1] : i
  if (!clean) return ""
  let bufferToUpload = clean
  try {
    const b = await sharp(Buffer.from(clean, "base64")).resize(800, 800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 60 }).toBuffer();
    bufferToUpload = b.toString("base64")
  } catch (e) {
    console.warn("Falha no Sharp, enviando imagem original:", e.message);
  }
  try {
    const params = new URLSearchParams()
    params.append("image", bufferToUpload)
    params.append("mimeType", "image/jpeg")
    params.append("name", `${Date.now()}.jpg`)
    const res = await fetch("https://script.google.com/macros/s/AKfycbxpNRGKsVmJp4Yy6kNFVPa68buikeX903xUSpGHL9Qsaxm8BJ63KEY7-s0f9LiCR3GHsg/execa", {
      method: "POST",
      body: params
    }).then(r => r.json())
    return res.url || res.data || ""
  } catch (err) {
    console.error("Erro na api do Script:", err)
    return ""
  }
}




router.get('/adm/usuarios', authMiddleware, async (req, res) => {
  try {
    const cargoSolicitante = (req.user.code || req.user.type || '').toUpperCase().trim();
    if (cargoSolicitante !== 'SUPERADMIN') {
      return res.status(403).json({
        status: false,
        mensagem: 'Acesso negado. Apenas o SUPERADMIN pode visualizar a lista de usuários.'
      })
    } await usuarioPromise;
    const Usuario = getUsuarioModel();
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['senha'] },
      order: [['id', 'ASC']]
    })
    return res.status(200).json({
      status: true,
      dados: usuarios
    })
  } catch (error) {
    console.error('Erro ao listar usuários para o SUPERADMIN: ', error);
    return res.status(500).json({
      status: false,
      mensagem: 'Erro interno no servidor ao buscar a lista de usuários.'
    })
  }
})







router.get('/coog/usuarios', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const userId = String(req.user?.id || req.user?.userId || req.usuario?.id || '');
    const usuarios = await getUsuarioModel().findAll({
      where: { [Op.or]: [{ id: userId }, { ref: userId }] },
      attributes: ['id', 'uuid', 'nome', 'email', 'celular', 'codigo', 'status', 'genero', 'createdAt', 'ref']
    });
    return res.status(200).json({ status: true, total: usuarios.length, dados: usuarios });
  } catch (error) {
    return res.status(500).json({ status: false, mensagem: 'Erro interno.' });
  }
});




router.get('/financeiro/usuarios', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const userId = req.user?.id || req.usuario?.id || req.user?.usuarioId || req.usuario?.usuarioId;
    const usuarioSolicitante = await Usuario.findByPk(userId);
    const codigo = (usuarioSolicitante?.codigo || '').toUpperCase().trim();
    if (!['FIN', 'SUPERADMIN'].includes(codigo)) {
      return res.status(403).json({ status: false, mensagem: `Acesso negado para o código: ${codigo}` });
    }
    const usuarios = await Usuario.findAll({ where: { codigo: ['FIN', 'COO', 'ALU', 'FOR'] }, attributes: ['id', 'uuid', 'nome', 'email', 'codigo'] });
    return res.json({ status: true, usuarios });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});






router.put('/adm/usuarios/:id', authMiddleware, async (req, res) => {
  try {
    const cargo = (req.user.code || req.user.type || '').toUpperCase().trim();
    if (cargo !== 'SUPERADMIN') return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });

    const { status, codigo } = req.body;
    const Usuario = getUsuarioModel();
    const target = await Usuario.findByPk(req.params.id);
    if (!target) return res.status(404).json({ status: false, mensagem: 'Usuário não encontrado.' });
    if (codigo && (codigo === 'SUPERADMIN' || codigo === 'ALU')) {
      return res.status(400).json({ status: false, mensagem: 'Não é permitido atribuir SUPERADMIN ou ALU por esta ação.' });
    }
    if (status) target.status = status;
    if (codigo) target.codigo = codigo;
    await target.save();

    return res.json({ status: true, mensagem: 'Usuário atualizado com sucesso.' });
  } catch (e) {
    return res.status(500).json({ status: false, mensagem: 'Erro ao atualizar usuário.' });
  }
})





router.post('/coo/turmas', authMiddleware, async (req, res) => {
  try {
    const cargo = (req.user.code || req.user.type || '').toUpperCase().trim();
    if (cargo !== 'COO' && cargo !== 'COOG' && cargo !== 'SUPERADMIN') return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    const { nome, modalidade, vagas_totais, local_sala, data_inicio, data_fim, horario, status } = req.body;
    if (!nome || !modalidade || !vagas_totais || !local_sala || !horario) return res.status(400).json({ status: false, mensagem: 'Preencha os campos obrigatórios.' });
    await turmaPromise;
    const Turma = getTurmaModel();
    const novaTurma = await Turma.create({ nome, modalidade, vagas_totais, local_sala, data_inicio, data_fim, horario, status, coo_id: req.user.id });
    return res.status(201).json({ status: true, mensagem: 'Turma cadastrada com sucesso!', dados: novaTurma });
  } catch (e) { return res.status(500).json({ status: false, mensagem: 'Erro interno ao cadastrar turma.' }); }
});




router.get('/turmas', authMiddleware, async (req, res) => {
  try {
    const cargo = (req.user.code || req.user.type || '').toUpperCase().trim();
    if (['FOR', 'ALU'].includes(cargo)) return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    if (!['COO', 'COOG', 'SUPERADMIN', 'FIN', 'SEC', 'MKT'].includes(cargo)) return res.status(403).json({ status: false, mensagem: 'Perfil sem permissão.' });
    await turmaPromise;
    const Turma = getTurmaModel();
    const turmas = await Turma.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ status: true, total: turmas.length, dados: turmas });
  } catch (e) { return res.status(500).json({ status: false, mensagem: 'Erro interno ao buscar turmas.' }); }
});



router.post('/add/cursos', authMiddleware, async (req, res) => {
  try {
    const cargo = (req.user.code || req.user.type || '').toUpperCase().trim();
    if (!['COO', 'COOG', 'SUPERADMIN'].includes(cargo)) return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    const { nome, area, descricao, carga_horaria, imagem, status } = req.body;
    if (!nome) return res.status(400).json({ status: false, mensagem: 'Nome é obrigatório.' });
    await cursoPromise; const Curso = getCursoModel();
    const st = (status === 'RASCUNHO') ? 'RASCUNHO' : 'INATIVO';
    const curso = await Curso.create({ nome, area, descricao, carga_horaria, imagem: imagem || null, coo_id: req.user.id, status: st, preco_status: 'PENDENTE' });
    return res.status(201).json({ status: true, mensagem: 'Curso criado com sucesso!', dados: curso });
  } catch (e) { return res.status(500).json({ status: false, mensagem: 'Erro ao criar curso. ' + e }); }
})



router.patch('/cursos/definir-preco', authMiddleware, async (req, res) => {
  try { await usuarioPromise; const user = await getUsuarioModel().findByPk(req.user?.id || req.usuario?.id);
    if (!['FIN', 'COO', 'SUPERADMIN'].includes((user?.codigo || '').toUpperCase().trim())) return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    const { curso_id, taxa_inscricao, taxa_certificado, num_prestacoes, preco } = req.body;
    const [updated] = await getCursoModel().update({
      taxa_inscricao: taxa_inscricao !== undefined && taxa_inscricao !== null && taxa_inscricao !== '' ? taxa_inscricao : 0,
      taxa_certificado: taxa_certificado !== undefined && taxa_certificado !== null && taxa_certificado !== '' ? taxa_certificado : 0,
      num_prestacoes: num_prestacoes !== undefined && num_prestacoes !== null && num_prestacoes !== '' ? num_prestacoes : 0,
      preco: preco !== undefined && preco !== null && preco !== '' ? preco : 0,
      preco_status: 'DEFINIDO', status: 'ATIVO', fin_id: user.id
    }, { where: { id: curso_id } });
    return updated ? res.json({ status: true, mensagem: 'Preços definidos e curso ativado!' }) : res.status(404).json({ status: false, mensagem: 'Curso não encontrado.' });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});



router.get('/cursos', async (req, res) => {
  try {
    const Curso = await cursoPromise;
    const cursos = await Curso.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ status: true, total: cursos.length, dados: cursos });
  } catch (e) { return res.status(500).json({ status: false, mensagem: 'Erro ao buscar cursos.' }); }
});



router.post('/turmas/:id/vincular-formador', authMiddleware, async (req, res) => {
  try {
    const Usuario = getUsuarioModel();
    const coo = await Usuario.findByPk(req.user.id);
    if (!coo || !['COO', 'SUPERADMIN'].includes(coo.tipo || coo.role)) { return res.status(403).json({ erro: 'Acesso negado: Apenas o COO pode vincular formadores.' }); }
    const { formador_id } = req.body;
    const formador = await Usuario.findOne({ where: { id: formador_id, [Op.or]: [{ tipo: 'FOR' }, { role: 'FOR' }] } });
    if (!formador) return res.status(400).json({ erro: 'Usuário informado não é um Formador (FOR) válido.' });

    const Turma = getTurmaModel();
    const TurmaConteudo = getTurmaConteudoModel();

    const turma = await Turma.findByPk(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada.' });

    await turma.update({ formador_id });
    const [conteudo] = await TurmaConteudo.findOrCreate({ where: { turma_id: turma.id }, defaults: { formador_id } });
    if (conteudo.formador_id !== formador_id) await conteudo.update({ formador_id });

    return res.json({ mensagem: 'Formador vinculado e espaço pedagógico criado/atualizado com sucesso!', turma, conteudo });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao vincular formador à turma.', detalhe: error.message });
  }
});


router.put('/turmas/:id/vincular-curso', authMiddleware, async (req, res) => {
  const user = await getUsuarioModel().findByPk(req.user.id);
  if (!['COO', 'SUPERADMIN'].includes(user?.tipo || user?.role)) return res.status(403).json({ erro: 'Acesso negado.' });
  const [curso, turma] = await Promise.all([getCursoModel().findByPk(req.body.curso_id), getTurmaModel().findByPk(req.params.id)]);
  if (!curso || !turma) return res.status(404).json(
    { erro: 'Curso ou Turma não encontrada.' });
  return res.json(
    { mensagem: 'Vínculo realizado!', turma: await turma.update({ curso_id: curso.id }) });
});





router.get('/financeiro/inscricoes-cursos', authMiddleware, async (req, res) => {
  try {
    const user = await getUsuarioModel().findByPk(req.user.id);
    if (!['FIN', 'SUPERADMIN'].includes(user?.codigo || user?.role)) return res.status(403).json({ erro: 'Acesso negado.' });
    const [inscricoes, cursos] = await Promise.all([getInscricaoModel().findAll(), getCursoModel().findAll()]);
    return res.json({ inscricoes, cursos });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao buscar dados financeiros.', detalhe: error.message });
  }
});




router.get('/alunos', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const userId = req.user?.id || req.usuario?.id || req.user?.usuarioId || req.usuario?.usuarioId;
    const user = await Usuario.findByPk(userId);
    if (!['FIN', 'COO', 'SUPERADMIN', 'SEC'].includes((user?.codigo || '').toUpperCase().trim())) return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    const alunos = await Usuario.findAll({ where: { codigo: 'ALU' }, attributes: ['id', 'uuid', 'nome', 'email', 'celular', 'genero', 'email_verificado', 'foto_url', 'data_nascimento', 'perfil_json', 'status'] });
    return res.json({ status: true, alunos });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});



router.get('/alunos/perfil', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const userId = req.user?.id || req.usuario?.id || req.user?.usuarioId || req.usuario?.usuarioId;
    const aluno = await Usuario.findByPk(userId, { attributes: ['id', 'uuid', 'nome', 'email', 'celular', 'genero', 'email_verificado', 'foto_url', 'data_nascimento', 'perfil_json', 'status', 'codigo'] });
    if (!aluno || (aluno.codigo || '').toUpperCase().trim() !== 'ALU') return res.status(403).json({ status: false, mensagem: 'Acesso restrito ao perfil de Aluno.' });
    return res.json({ status: true, perfil: aluno });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});




router.post('/alunos/reenviar-verificacao', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const user = await getUsuarioModel().findByPk(req.user?.id || req.usuario?.id);
    if (!user || user.codigo !== 'ALU' || user.email_verificado) return res.status(400).json({ status: false, mensagem: 'Solicitação inválida ou e-mail já verificado.' });
    const message = `Olá, ${user.nome}!\n\nSeu código de verificação é: ${user['2fa_code']}.\nUse este código para confirmar seu e-mail e liberar todas as funções do painel.`;
    await fetch('https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec', { method: 'POST', body: JSON.stringify({ email: [user.email], title: 'Verificação de E-mail', message, senderId: 'Lojium empreendimentos' }) });
    return res.json({ status: true, mensagem: 'E-mail enviado! Verifique a sua caixa de entrada.' });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});



router.post('/alunos/validar-codigo', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const userId = req.user?.id || req.usuario?.id || req.user?.usuarioId || req.usuario?.usuarioId;
    const { codigo } = req.body;
    const user = await Usuario.findByPk(userId);
    if (!user || user.codigo !== 'ALU') return res.status(403).json({ status: false, mensagem: 'Acesso negado.' });
    if (!codigo || user['2fa_code'] !== codigo.toString().trim()) return res.status(400).json({ status: false, mensagem: 'Código incorreto. Verifique a sua caixa de entrada.' });
    await user.update({ email_verificado: true, '2fa_code': null });
    return res.json({ status: true, mensagem: 'E-mail verificado com sucesso!' });
  } catch (error) { return res.status(500).json({ status: false, mensagem: error.message }); }
});








router.patch('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await getUsuarioModel().findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const perfilAtual = usuario.perfil_json || {};
    if (perfilAtual.verificacao?.status === 'aprovado') {
      return res.status(403).json({ error: 'Perfil aprovado não pode ser alterado.' });
    }
    const { nome, genero, data_nascimento, celular, foto_url, perfil_json: pInput = {} } = req.body;
    const validarNome = n => typeof n === 'string' && n.trim().split(/\s+/).filter(Boolean).length >= 2;
    if (nome && !validarNome(nome)) return res.status(400).json({ error: 'Informe nome e apelido.' });
    if (pInput.nome_pai && !validarNome(pInput.nome_pai)) return res.status(400).json({ error: 'Nome do pai deve ter nome e apelido.' });
    if (pInput.nome_mae && !validarNome(pInput.nome_mae)) return res.status(400).json({ error: 'Nome da mãe deve ter nome e apelido.' });

    const [foto, docF, docV, cert] = await Promise.all([
      upImg(foto_url), upImg(pInput.doc_frente), upImg(pInput.doc_verso), upImg(pInput.certificado_doc)
    ]);
    const novoPerfilJson = {
      ...perfilAtual,
      ...pInput,
      doc_frente: docF || perfilAtual.doc_frente || null,
      doc_verso: docV || perfilAtual.doc_verso || null,
      certificado_doc: cert || perfilAtual.certificado_doc || null,
      verificacao: { status: 'em_analise', aprovado_por: null, atualizado_em: new Date() }
    };
    await usuario.update({
      ...(nome && { nome: nome.trim() }),
      ...(genero && { genero }),
      ...(data_nascimento && { data_nascimento }),
      ...(celular && { celular }),
      ...(foto && { foto_url: foto }),
      perfil_json: novoPerfilJson
    });

    res.json({ mensagem: 'Perfil atualizado com sucesso.', usuario });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno ao salvar perfil.' + err });
  }
});



router.get('/secretaria/alunos', authMiddleware, async (req, res) => {
  try {
    const usuario = await getUsuarioModel().findByPk(req.user?.id, { attributes: ['codigo'] });
    if (!usuario?.codigo?.startsWith('SEC')) return res.status(403).json({ error: 'Acesso negado. Apenas secretaria.' });
    const alunos = await getUsuarioModel().findAll({ where: { codigo: 'ALU' }, attributes: { exclude: ['senha'] } });
    res.json(alunos);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar alunos.' + err }); }
});




router.patch('/secretaria/alunos/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body; const { id } = req.params;
    if (!['aprovado', 'em_analise', 'rejeitado', 'pendente'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido informado.' });
    } const Usuario = await getUsuarioModel();
    const adminLogado = await Usuario.findByPk(req.user?.id || req.userId, { attributes: ['codigo', 'nome'] });
    if (!adminLogado?.codigo?.startsWith('SEC')) {
      return res.status(403).json({ error: 'Acesso negado. Apenas secretaria.' });
    } const aluno = await Usuario.findByPk(id); if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    const perfilAtual = JSON.parse(JSON.stringify(aluno.perfil_json || {}));
    perfilAtual.verificacao = { status, aprovado_por: adminLogado.nome, atualizado_em: new Date().toISOString() };
    aluno.perfil_json = perfilAtual; aluno.changed('perfil_json', true); await aluno.save();
    res.json({ message: 'Status atualizado com sucesso.', verificacao: perfilAtual.verificacao });
  } catch (err) {
    console.error('Erro ao atualizar status do aluno:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar status: ' + err.message });
  }
});



router.get('/cursos-aluno', authMiddleware, async (req, res) => {
  try {
    if ((await getUsuarioModel().findByPk(req.user?.id))?.codigo !== 'ALU') return res.status(403).json({ erro: 'Acesso negado.' });
    return res.json(await getCursoModel().findAll({ where: { status: 'ATIVO', preco_status: 'DEFINIDO' }, attributes: { exclude: ['coo_id', 'fin_id', 'createdAt', 'updatedAt'] } }));
  } catch (e) { return res.status(500).json({ erro: e.message }); }
});




router.get('/publico/cursos', async (req, res) => {
  try {
    const { cursoPromise, getCursoModel } = require('../models/cursos'); 
    await cursoPromise;
    const cursos = await getCursoModel().findAll({
      where: { status: 'ATIVO', preco_status: 'DEFINIDO' },
      attributes: { exclude: ['coo_id', 'fin_id', 'createdAt', 'updatedAt'] }
    });
    return res.json(cursos);
  } catch (e) { return res.status(500).json({ erro: e.message }); }
});





const NIVEIS = { 'sem_exigencia': 0, 'ensino_basico': 1, 'ensino_medio': 2, 'tecnico': 3, 'licenciatura': 4, 'mestrado': 5, 'doutoramento': 6 };
router.post('/inscricao', authMiddleware, async (req, res) => {
  try {
    const { curso_id } = req.body;
    if (!curso_id) return res.status(400).json({ error: 'ID do curso é obrigatório.' });

    const usuario = await getUsuarioModel().findByPk(req.user.id);
    if (!usuario || !usuario.codigo?.startsWith('ALU')) return res.status(403).json({ error: 'Apenas alunos podem se inscrever.' });
    if (!usuario.email_verificado) return res.status(403).json({ error: 'E-mail não verificado.' });

    const perfil = usuario.perfil_json || {};
    if (perfil.verificacao?.status !== 'aprovado') return res.status(403).json({ error: 'Perfil precisa estar aprovado para se inscrever.' });

    const jaInscrito = await getInscricaoModel().findOne({ where: { aluno_id: usuario.id, curso_id } });
    if (jaInscrito) return res.status(400).json({ error: 'Você já possui uma inscrição neste curso.' });

    const curso = await getCursoModel().findByPk(curso_id);
    if (!curso) return res.status(404).json({ error: 'Curso não encontrado.' });

    const reqEscolaridade = curso.dados_json?.nivel_escolaridade || 'sem_exigencia';
    const alunoEscolaridade = perfil.nivel_escolaridade || 'sem_exigencia';
    if ((NIVEIS[alunoEscolaridade] || 0) < (NIVEIS[reqEscolaridade] || 0)) {
      return res.status(400).json({ error: `Escolaridade insuficiente. Exige: ${reqEscolaridade}.` });
    }

    const codigoInscricao = Math.random().toString(36).substring(2, 11).toUpperCase();
    const numPrestacoes = curso.num_prestacoes || 1;
    const valorPrestacao = parseFloat(((curso.preco || 0) / numPrestacoes).toFixed(2));

    const novaInscricao = await getInscricaoModel().create({
      codigo_inscricao: codigoInscricao,
      aluno_id: usuario.id,
      curso_id: curso.id,
      turma_id: null,
      status: 'PENDENTE',
      status_pagamento: 'PENDENTE',
      valor_actual: {
        preco_curso: curso.preco || 0,
        taxa_inscricao: curso.taxa_inscricao || 0,
        taxa_certificado: curso.taxa_certificado || 0,
        num_prestacoes: numPrestacoes
      },
      mensalidades_json: Array.from({ length: numPrestacoes }, (_, i) => ({
        n_prestacao: i + 1,
        valor: valorPrestacao,
        status: 'PENDENTE',
        comprovativo: null,
        data_pagamento: null,
        validado_por_fin: null
      }))
    });
    return res.status(201).json({ message: 'Inscrição realizada com sucesso!', inscricao: novaInscricao });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao processar inscrição.' });
  }
});


router.get('/aluno/inscricoes', authMiddleware, async (req, res) => {
  try {
    const { inscricaoPromise, getInscricaoModel } = require('../models/inscricoes');
    await inscricaoPromise;
    const usuario = await getUsuarioModel().findByPk(req.user.id);
    if (!usuario || !usuario.codigo?.startsWith('ALU')) return res.status(403).json({ error: 'Acesso restrito.' });
    const inscricoes = await getInscricaoModel().findAll({ where: { aluno_id: usuario.id }, order: [['createdAt', 'DESC']] });
    return res.json(inscricoes);
  } catch (err) { return res.status(500).json({ error: 'Erro interno ao buscar inscrições.', detalhe: err.message }); }
});


router.get('/contas-pagamento', authMiddleware, async (req, res) => {
  try {
    await carteiraPagamentoPromise;
    const { curso_id } = req.query;
    const curso = curso_id ? await getCursoModel().findByPk(curso_id) : null;
    const onde = { status: 'APROVADO', [Op.or]: [{ destinado_a: 'TODOS' }, ...(curso?.fin_id ? [{ destinado_a: 'MEUS_CURSOS', fin_id: curso.fin_id }] : [])] };
    const todas = await getCarteiraPagamentoModel().findAll({ where: onde });
    const grupos = Array.from(new Set(todas.map(c => c.nome_banco))).map(b => {
      const doBanco = todas.filter(c => c.nome_banco === b);
      return doBanco[Math.floor(Math.random() * doBanco.length)];
    }).slice(0, 4);
    return res.json(grupos.map(c => ({ id: c.id, tipo: c.nome_banco, titular: c.titular, numero: c.numero_conta })));
  } catch (err) { return res.status(500).json({ error: 'Erro ao buscar contas.' }); }
});


router.post('/aluno/comprovativo', authMiddleware, async (req, res) => {
  const { inscricao_id, conta_id, comprovativo } = req.body;
  const [u, [ins, car]] = await Promise.all([usuarioPromise.then(U => U.findByPk(req.user.id)), Promise.all([inscricaoPromise.then(I => I.findOne({ where: { id: inscricao_id, aluno_id: req.user.id } })), carteiraPagamentoPromise.then(C => C.findByPk(conta_id))])]);
  if (!u?.codigo?.startsWith('ALU') || u.perfil_json?.verificacao?.status !== 'aprovado' || !ins || !car || car.status !== 'APROVADO') return res.status(403).json({ error: 'Não autorizado ou inválido.' });
  const b = Buffer.from(comprovativo.includes(',') ? comprovativo.split(',')[1] : comprovativo, 'base64');
  const url = (await fetch('https://script.google.com/macros/s/AKfycbxpNRGKsVmJp4Yy6kNFVPa68buikeX903xUSpGHL9Qsaxm8BJ63KEY7-s0f9LiCR3GHsg/execa', { method: 'POST', body: new URLSearchParams({ image: (await sharp(b).resize(800, 800, { fit: 'inside' }).jpeg({ quality: 60 }).toBuffer()).toString('base64'), mimeType: 'image/jpeg', name: `${Date.now()}.jpg` }) }).then(x => x.json())).url;
  if (!url) return res.status(500).json({ error: 'Erro imagem.' });
  const taxa = parseFloat(ins.valor_actual?.taxa_inscricao || 0), ij = ins.inscricao_json || { status: 'PENDENTE' }, mens = Array.isArray(ins.mensalidades_json) ? [...ins.mensalidades_json] : [];
  if (taxa > 0 && ij.status !== 'APROVADO') { if (ij.status === 'EM_VERIFICACAO' || (ij.status === 'PENDENTE' && ij.comprovativo)) return res.status(400).json({ error: 'Pendente.' }); ins.inscricao_json = { ...ij, status: 'EM_VERIFICACAO', comprovativo: url, conta_id: Number(conta_id), data_submissao: new Date().toISOString() }; }
  else { const idx = mens.findIndex(m => m.status === 'PENDENTE' || m.status === 'REJEITADO'); if (idx === -1 || (idx > 0 && !['APROVADO', 'PAGO'].includes(mens[idx - 1].status))) return res.status(400).json({ error: 'Erro sequência ou concluído.' }); mens[idx] = { ...mens[idx], status: 'EM_VERIFICACAO', comprovativo: url, conta_id: Number(conta_id), data_pagamento: new Date().toISOString() }; ins.mensalidades_json = mens; }
  await Promise.all([ins.update({ inscricao_json: ins.inscricao_json, mensalidades_json: ins.mensalidades_json, status_pagamento: 'PENDENTE' }), car.update({ transacoes_json: [...(car.transacoes_json || []), { tx_id: `TX-${Math.random().toString(36).substring(2,9).toUpperCase()}`, aluno_id: u.id, inscricao_id: ins.id, conta_id: Number(conta_id), comprovativo_url: url, status: 'PENDENTE', data_submissao: new Date().toISOString() }] })]);
  return res.json({ message: 'Enviado com sucesso!', url });
});




router.get('/carteiras', authMiddleware, async (req, res) => {
  try {
    const Carteira = await carteiraPagamentoPromise;
    const userId = req.user.id;
    const carteiras = await Carteira.findAll({
      where: { [Op.or]: [{ fin_id: userId }, { destinado_a: 'TODOS' }] }
    });
    return res.json(carteiras);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar carteiras.' });
  }
});



router.post('/carteiras', authMiddleware, async (req, res) => {
  try {
    await carteiraPagamentoPromise;
    const { nome_banco, titular, numero_conta, destinado_a, descricao } = req.body;
    
    const novaCarteira = await getCarteiraPagamentoModel().create({
      fin_id: req.user.id,
      nome_banco,
      titular,
      numero_conta,
      destinado_a: destinado_a || 'TODOS',
      descricao: descricao || null
    });
    
    return res.json({ status: true, mensagem: 'Carteira criada com sucesso!', carteira: novaCarteira });
  } catch (error) {
    return res.status(500).json({ status: false, mensagem: error.message });
  }
});



router.get('/operador/inscricao/:id', authMiddleware, async (req, res) => {
  try {
    const Inscricao = await inscricaoPromise;
    const Usuario = await usuarioPromise;
    
    const inscricao = await Inscricao.findByPk(req.params.id);
    if (!inscricao) return res.status(404).json({ error: 'Inscrição não encontrada.' });

    const aluno = await Usuario.findByPk(inscricao.aluno_id, { attributes: ['id', 'nome', 'email', 'codigo'] });
    
    const curso = await getCursoModel().findByPk(inscricao.curso_id);
    const coordenador = curso ? await Usuario.findByPk(curso.coo_id, { attributes: ['id', 'nome', 'email'] }) : null;

    return res.json({
      inscricao,
      aluno,
      curso: curso ? { id: curso.id, nome: curso.nome, area: curso.area } : null,
      coordenador
    });
  } catch (err) {
    console.error("Erro ao buscar detalhes da inscrição:", err);
    return res.status(500).json({ error: 'Erro ao carregar detalhes da inscrição.' });
  }
});



router.post('/operador/validar-pagamento', authMiddleware, async (req, res) => {
  try {
    const { inscricao_id, item, status, motivo_rejeicao } = req.body;
    const [U, I, C] = await Promise.all([usuarioPromise, inscricaoPromise, carteiraPagamentoPromise]);
    const u = await U.findByPk(req.user.id);
    const ins = await I.findByPk(inscricao_id);
    if (!ins) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    
    let objItem = item === 'taxa_inscricao' ? ins.inscricao_json : item.startsWith('prestacao_') ? (ins.mensalidades_json || []).find(x => x.n_prestacao === parseInt(item.split('_')[1])) : ins.certificado_json;
    const car = await C.findByPk(objItem?.conta_id || req.body.conta_id || (await C.findOne())?.id);
    if (!car || Number(car.usuario_id) !== Number(u.id) && !['SUPERA', 'COO', 'FIN'].includes(u.codigo?.substring(0, 5))) return res.status(403).json({ error: 'Não autorizado.' });

    if (item === 'taxa_inscricao') ins.inscricao_json = { ...ins.inscricao_json, status, paga: status === 'APROVADO', motivo_rejeicao: motivo_rejeicao || null };
    else if (item.startsWith('prestacao_')) {
      const mens = ins.mensalidades_json || [], m = mens.find(x => x.n_prestacao === parseInt(item.split('_')[1]));
      if (m) { m.status = status === 'APROVADO' ? 'PAGO' : 'REJEITADO'; m.motivo_rejeicao = motivo_rejeicao || null; ins.mensalidades_json = [...mens]; }
    } else if (item === 'taxa_certificado') ins.certificado_json = { ...ins.certificado_json, taxa_paga: status === 'APROVADO', em_verificacao: false, motivo_rejeicao: motivo_rejeicao || null };

    const trans = car.transacoes_json || [], tAlvo = trans.slice().reverse().find(t => String(t.inscricao_id) === String(ins.id) && t.conteudo === item && t.status === 'PENDENTE');
    let val = tAlvo ? parseFloat(tAlvo.valor || 0) : (item === 'taxa_inscricao' ? parseFloat(ins.valor_actual?.taxa_inscricao || 0) : item.startsWith('prestacao_') ? parseFloat((ins.mensalidades_json || []).find(x => x.n_prestacao === parseInt(item.split('_')[1]))?.valor || 0) : parseFloat(ins.valor_actual?.taxa_certificado || 0));
    if (tAlvo) { tAlvo.status = status; if (motivo_rejeicao) tAlvo.motivo_rejeicao = motivo_rejeicao; }

    ['inscricao_json', 'mensalidades_json', 'certificado_json'].forEach(k => ins.changed(k, true));
    await Promise.all([ins.save(), car.update({ transacoes_json: trans, saldo_total: parseFloat(car.saldo_total || 0) + (status === 'APROVADO' ? val : 0) })]);
    return res.json({ message: `Pagamento atualizado para ${status} com sucesso!` });
  } catch (e) { return res.status(500).json({ error: 'Erro interno.' }); }
});




async function testarCriarCarteira() {
  await carteiraPagamentoPromise;
  const c = await getCarteiraPagamentoModel().create({
    fin_id: 3, nome_banco: 'E-mola', titular: 'Abdul faquir', numero_conta: '879181555',
    destinado_a: 'TODOS', aprovacao_regras: 'APENAS_CRIADOR', status: 'PENDENTE'
  });
  console.log("✅ Carteira criada ID:", c.id);
}


async function mostrarTodosUsuariosLog() {
  try {
    const Usuario = await usuarioPromise;
    if (!Usuario) {
      console.error("❌ Modelo de Usuário não inicializado.");
      return;
    }

    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nome', 'email', 'codigo', 'email_verificado', 'createdAt'],
      raw: true
    });
    
    console.log(`\n📋 Lista de Usuários no Sistema (${usuarios.length} encontrados):`);
    console.table(usuarios);
  } catch (err) {
    console.error("Erro ao listar usuários no log:", err.message);
  }
}
async function atualizarOperadorContasPagamento() {
  try {
    const Carteira = await carteiraPagamentoPromise;
    if (!Carteira) {
      console.error("❌ Modelo de Carteira de Pagamento não inicializado.");
      return;
    }

    const [linhasAfetadas] = await Carteira.update(
      { fin_id: 3 },
      { where: { id: [1, 2] } }
    );

    console.log(`✅ Sucesso! ${linhasAfetadas} carteira(s) atualizada(s) para o fin_id 3.`);
  } catch (err) {
    console.error("Erro ao atualizar o fin_id das contas de pagamento:", err.message);
  }
}




router.get('/superadmin/dados-globais', authMiddleware, async (req, res) => {
  try {
    const [Usuario, Inscricao, Curso, Carteira] = await Promise.all([usuarioPromise, inscricaoPromise, getCursoModel(), carteiraPagamentoPromise]);
    const usuarioLogado = await Usuario.findByPk(req.user.id);
    if (!usuarioLogado || usuarioLogado.codigo !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a Superadmins.' });
    }
    const [usuarios, inscricoes, cursos, carteiras] = await Promise.all([ Usuario.findAll(), Inscricao.findAll(), Curso.findAll(), Carteira.findAll()]);
    return res.json({ usuarios, inscricoes, cursos, carteiras });
  } catch (err) {
    console.error("Erro ao buscar dados globais:", err);
    return res.status(500).json({ error: 'Erro interno ao carregar dados globais do superadmin.' });
  }
});



router.patch('/:forId/vincular-coordenacao', async (req, res) => {
  try { await usuarioPromise; const { ref } = req.body;
    const [formador, coordenador] = await Promise.all([getUsuarioModel().findByPk(req.params.forId), getUsuarioModel().findByPk(ref)]);
    if (!formador || !coordenador) return res.status(404).json({ status: false, mensagem: 'Formador ou Coordenador não encontrado.' });
    formador.ref = ref; await formador.save();
    const urlApi = 'https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec';
    const bodyCoord = { email: [coordenador.email], title: 'Novo Formador Vinculado à Coordenação', message: `Olá, ${coordenador.nome}!\n\nO formador ${formador.nome} foi vinculado com sucesso à sua coordenação na plataforma CM-CETROPROHC.\nDetalhes: Já pode gerir as turmas e acompanhar as atividades pedagógicas atribuídas a este formador.`, senderId: 'Lojium empreendimentos' };
    const bodyFormador = { email: [formador.email], title: 'Atribuição de Coordenação Realizada', message: `Olá, ${formador.nome}!\n\nFoi integrado na coordenação liderada por ${coordenador.nome}.\nDetalhes: Aceda ao seu painel institucional para consultar as orientações, turmas e cronograma de atividades pedagógicas.`, senderId: 'Lojium empreendimentos' };
    await Promise.all([ fetch(urlApi, { method: 'POST', body: JSON.stringify(bodyCoord) }), fetch(urlApi, { method: 'POST', body: JSON.stringify(bodyFormador) }) ]);
    return res.json({ status: true, mensagem: 'Formador vinculado com sucesso e e-mails personalizados enviados.' });
  } catch (err) { console.error(err);
    return res.status(500).json({ status: false, mensagem: 'Erro interno ao processar a vinculação.' });
  }
});




router.get('/turmas/:id/detalhes-completos', authMiddleware, async (req, res) => {
  try {
    await Promise.all([turmaPromise, turmaConteudoPromise, inscricaoPromise, usuarioPromise]);
    const turma = await getTurmaModel().findByPk(req.params.id);
    if (!turma) return res.status(404).json({ status: false, mensagem: 'Turma não encontrada.' });
    const [formador, conteudo, inscricoes] = await Promise.all([
      turma.formador_id ? getUsuarioModel().findByPk(turma.formador_id, { attributes: ['id', 'nome', 'email'] }) : null,
      getTurmaConteudoModel().findOne({ where: { turma_id: req.params.id } }),
      getInscricaoModel().findAll({ where: { turma_id: req.params.id } })
    ]);
    const alunosIds = inscricoes.map(i => i.aluno_id);
    const alunos = alunosIds.length > 0 ? await getUsuarioModel().findAll({ where: { id: alunosIds }, attributes: ['id', 'nome', 'email', 'celular'] }) : [];
    const mapaAlunos = {}; alunos.forEach(a => mapaAlunos[a.id] = a);
    const inscricoesComAlunos = inscricoes.map(i => ({ ...i.toJSON(), aluno: mapaAlunos[i.aluno_id] || null }));
    return res.status(200).json({ status: true, turma: { ...turma.toJSON(), formador }, conteudo: conteudo || {}, inscricoes: inscricoesComAlunos });
  } catch (error) { console.error('Erro nos detalhes:', error);
    return res.status(500).json({ status: false, mensagem: 'Erro interno ao processar detalhes.' });
  }
});



router.put('/turmas/:turmaId/formador', authMiddleware, async (req, res) => {
  try {
    await Promise.all([turmaPromise, usuarioPromise]);
    const turma = await getTurmaModel().findByPk(req.params.turmaId);
    if (!turma) return res.status(404).json({ status: false, mensagem: 'Turma não encontrada.' });
    turma.formador_id = req.body.formador_id || null; await turma.save();
    if (turma.formador_id) {
      const f = await getUsuarioModel().findByPk(turma.formador_id);
      if (f?.email) await fetch('https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [f.email], title: 'Atribuição de Turma', message: `Olá ${f.nome}, foste atribuído como formador da turma ${turma.nome} na CM CETROPROHC.`, senderId: 'CM CETROPROHC - Lojium empreendimentos' }) });
    }
    return res.status(200).json({ status: true, mensagem: 'Formador atualizado com sucesso!' });
  } catch (error) { return res.status(500).json({ status: false, mensagem: 'Erro interno.' }); }
});



router.put('/turmas/:turmaId/curso', authMiddleware, async (req, res) => {
  try { await turmaPromise; const turma = await getTurmaModel().findByPk(req.params.turmaId);
    if (!turma) return res.status(404).json({ status: false, mensagem: 'Turma não encontrada.' });
    const { curso_id } = req.body; turma.curso_id = curso_id || null; await turma.save();
    return res.status(200).json({ status: true, mensagem: 'Curso atribuído com sucesso!' });
  } catch (error) { console.error('Erro ao atribuir curso:', error);
    return res.status(500).json({ status: false, mensagem: 'Erro interno ao atribuir curso.' });
  }
})



router.get('/professor/meu-painel', authMiddleware, async (req, res) => {
  try {
    await Promise.all([turmaPromise, turmaConteudoPromise, inscricaoPromise, usuarioPromise]);
    const formadorId = req.user?.id || req.user?.userId;
    const turmas = await getTurmaModel().findAll({ where: { formador_id: formadorId } });
    const turmaIds = turmas.map(t => t.id);
    
    const [conteudos, inscricoes] = await Promise.all([
      getTurmaConteudoModel().findAll({ where: { turma_id: turmaIds } }),
      getInscricaoModel().findAll({ where: { turma_id: turmaIds } })
    ]);

    const alunosIds = [...new Set(inscricoes.map(i => i.aluno_id))];
    const alunos = alunosIds.length > 0 ? await getUsuarioModel().findAll({ where: { id: alunosIds }, attributes: ['id', 'nome', 'email', 'celular'] }) : [];
    const mapaAlunos = {}; alunos.forEach(a => mapaAlunos[a.id] = a);
    const inscricoesComAlunos = inscricoes.map(i => ({ ...i.toJSON(), aluno: mapaAlunos[i.aluno_id] || null }));

    return res.status(200).json({ status: true, turmas, conteudos, inscricoes: inscricoesComAlunos });
  } catch (error) { 
    console.error('Erro no painel professor:', error);
    return res.status(500).json({ status: false, mensagem: 'Erro interno.' }); 
  }
});



router.post('/turmas/conteudos', authMiddleware, async (req, res) => {
  try {
    const TC = await turmaConteudoPromise;
    const { turma_id, tipo, nome, modulo_id, descricao, url, duracao } = req.body;
    const tUpper = (tipo || '').toUpperCase();
    let tc = await TC.findOne({ where: { turma_id } }) || await TC.create({ turma_id, formador_id: req.user.id });
    if (tUpper === 'MODULO') { tc.modulos_json = [...(tc.modulos_json || []), { id: Date.now(), nome, descricao: descricao || '', liberado: true, data_liberacao: new Date().toISOString().split('T')[0] }];
    } else { if (!modulo_id) return res.status(400).json({ status: false, error: 'Selecione um módulo associado.' });
      if (tUpper === 'EXERCICIO' || tUpper === 'AVALIACAO') {
        tc.avaliacoes_json = [...(tc.avaliacoes_json || []), { id: Date.now(), modulo_id: Number(modulo_id), titulo: nome, texto_perguntas: descricao || '', url_pdf: url || '' }];
      } else {
        tc.aulas_json = [...(tc.aulas_json || []), { id: Date.now(), modulo_id: Number(modulo_id), nome, descricao: descricao || '', duracao_min: Number(duracao) || 15, video_url: url || '' }];
      } } await tc.update({ modulos_json: tc.modulos_json, aulas_json: tc.aulas_json, avaliacoes_json: tc.avaliacoes_json, formador_id: req.user.id });
    return res.json({ status: true, message: 'Guardado com sucesso!' });
  } catch (e) {  console.error("Erro ao salvar conteúdo:", e);
    return res.status(500).json({ status: false, error: 'Erro interno ao guardar.' }); 
  }
});



router.get('/coo/painel-geral', authMiddleware, async (req, res) => {
  try {
    const [C, T, I, U] = await Promise.all([cursoPromise, turmaPromise, inscricaoPromise, usuarioPromise]);
    const [cursos, turmas] = await Promise.all([C.findAll({ where: { coo_id: req.user.id } }), T.findAll({ where: { coo_id: req.user.id } })]);
    const inscricoes = await I.findAll({ where: { curso_id: cursos.map(c => c.id) } });
    const alunos = await U.findAll({ where: { id: inscricoes.map(i => i.aluno_id), codigo: 'ALU' } });
    return res.json({ status: true, cursos, turmas, inscricoes, alunos });
  } catch (e) { return res.status(500).json({ error: 'Erro interno.' }); }
});


router.patch('/coo/turmas/:turmaId/atribuir-aluno', authMiddleware, async (req, res) => {
  try { const { turmaId } = req.params;  const { inscricao_id } = req.body; const [T, I] = await Promise.all([turmaPromise, inscricaoPromise]);
    const turmaNova = await T.findOne({ where: { id: turmaId, coo_id: req.user.id } });
    if (!turmaNova) return res.status(404).json({ error: 'Turma não encontrada ou sem permissão.' });
    const inscricao = await I.findOne({ where: { id: inscricao_id } });
    if (!inscricao) return res.status(404).json({ error: 'Inscrição não encontrada.' });
    const turmaAntigaId = inscricao.turma_id;
    if (turmaAntigaId && Number(turmaAntigaId) !== Number(turmaId)) {
      const turmaAntiga = await T.findOne({ where: { id: turmaAntigaId } });
      if (turmaAntiga) { turmaAntiga.vagas_totais = (turmaAntiga.vagas_totais || 30) + 1;
        await turmaAntiga.save(); } } if (!turmaAntigaId || Number(turmaAntigaId) !== Number(turmaId)) {
      turmaNova.vagas_totais = Math.max(0, (turmaNova.vagas_totais || 30) - 1);
      await turmaNova.save();
    } inscricao.turma_id = turmaId; await inscricao.save(); return res.json({ status: true, message: 'Aluno atribuído à turma com sucesso!' });
  } catch (e) { return res.status(500).json({ error: 'Erro interno no servidor.' }); }
});



router.get('/aluno/minhas-turmas-inscricoes', authMiddleware, async (req, res) => {
  try {
    const [I, T, C, TC] = await Promise.all([inscricaoPromise, turmaPromise, cursoPromise, turmaConteudoPromise]);
    const inscricoes = await I.findAll({ where: { aluno_id: req.user.id } });
    const turmaIds = inscricoes.map(i => i.turma_id).filter(Boolean);
    const [turmas, cursos, conteudos] = await Promise.all([
      T.findAll({ where: { id: turmaIds } }),
      C.findAll({ where: { id: inscricoes.map(i => i.curso_id) } }),
      TC.findAll({ where: { turma_id: turmaIds } })
    ]);
    return res.json({ status: true, inscricoes, turmas, cursos, conteudos });
  } catch (e) { return res.status(500).json({ error: 'Erro interno.' }); }
});





router.get('/admin/reenviar-todos-codigos', async (req, res) => {
  try {
    const U = await usuarioPromise;
    const usuarios = await U.findAll({ where: { email_verificado: false } });
    for (const u of usuarios) {
      if (!u['2fa_code']) { u['2fa_code'] = Math.floor(100000 + Math.random() * 900000).toString(); await u.save(); }
      const msg = `Olá ${u.nome},\n\nO seu código de verificação é: ${u['2fa_code']}.\nAtive a sua conta no CM-CETROPROHC.`;
      await fetch('https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec', {
        method: 'POST', body: JSON.stringify({ email: [u.email], title: 'Confirmação de Conta', message: msg, senderId: 'Lojium empreendimentos' })
      });
    }
    return res.json({ status: true, total_enviados: usuarios.length, mensagem: 'Reenvio executado com sucesso!' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});


router.patch('/carteiras/:id/:acao', authMiddleware, async (req, res) => {
  try {
    const status = req.params.acao === 'aprovar' ? 'APROVADO' : 'INATIVO';
    const [updated] = await getCarteiraPagamentoModel().update({ status, aprovado_por: req.user.id }, { where: { id: req.params.id } });
    return updated ? res.json({ status: true }) : res.status(404).json({ status: false });
  } catch (e) { return res.status(500).json({ status: false, erro: e.message }); }
});



// Solicitar recuperação de senha
router.post('/usuarios/alu/esqueci-senha', async (req, res) => {
  try {
    const u = await getUsuarioModel().findOne({ where: { email: req.body.email } });
    if (!u) return res.status(404).json({ status: false, mensagem: 'E-mail não encontrado.' });
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await u.update({ '2fa_code': code });
    // Dispare aqui a sua integração com Google Apps Script / Email com o link: ?email=${u.email}&code=${code}
    return res.json({ status: true, mensagem: 'Link enviado com sucesso.' });
  } catch (e) { return res.status(500).json({ status: false, mensagem: e.message }); }
});

// Redefinir senha com o código recebido
router.post('/usuarios/alu/redefinir-senha', async (req, res) => {
  try {
    const { email, code, novaSenha } = req.body;
    const u = await getUsuarioModel().findOne({ where: { email, '2fa_code': code } });
    if (!u) return res.status(400).json({ status: false, mensagem: 'Código ou e-mail inválido.' });
    const bcrypt = require('bcryptjs');
    const senha_hash = await bcrypt.hash(novaSenha, 10);
    await u.update({ senha_hash, '2fa_code': null });
    return res.json({ status: true, mensagem: 'Senha alterada com sucesso!' });
  } catch (e) { return res.status(500).json({ status: false, mensagem: e.message }); }
});


module.exports = router