const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require("jsonwebtoken")
require("dotenv").config()
const { getUsuarioModel, usuarioPromise } = require('../models/usuarios');

const authMiddleware = require("../middleware/authentication")

function gerarCodigo2FA() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

async function sendcode(nome, email, code) {
  const msg = `Olá ${nome},\n\nBem-vindo ao CM-CETROPROHC! O seu código de verificação é: ${code}.\nUtilize este código para ativar a sua conta e aceder a todas as funcionalidades exclusivas da nossa plataforma de ensino.`;
  const res = await fetch('https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec', {
    method: 'POST', body: JSON.stringify({ email: [email], title: 'Código de Verificação - CM-CETROPROHC', message: msg, senderId: 'CM CETROPROHC - Lojium empreendimentos' })
  });
  return await res.json();
}



router.post('/alu/cadastro', async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const { nome, email, senha, celular } = req.body;
    const erros = [];
    if (!nome || typeof nome !== 'string' || nome.trim().length < 3) {
      erros.push('O nome é obrigatório e deve ter pelo menos 3 caracteres.');
    }
    if (!email || !validator.isEmail(String(email))) {
      erros.push('Forneça um endereço de e-mail válido.');
    }
    if (!senha || typeof senha !== 'string' || senha.length < 6) {
      erros.push('A senha é obrigatória e deve ter no mínimo 6 caracteres.');
    }
    if (celular && typeof celular !== 'string') {
      erros.push('O número de celular deve ser um texto válido.');
    }
    if (erros.length > 0) {
      return res.status(400).json({ status: false, erros });
    }
    const emailLimpo = email.trim().toLowerCase();
    const usuarioExiste = await Usuario.findOne({ where: { email: emailLimpo } });
    if (usuarioExiste) {
      return res.status(409).json({
        status: false,
        mensagem: 'Este e-mail já está cadastrado no sistema.',
      });
    }
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const code2FA = gerarCodigo2FA();

    const novoAluno = await Usuario.create({
      ref: null,
      codigo: 'ALU',
      nome: nome.trim(),
      email: emailLimpo,
      celular: celular ? celular.trim() : null,
      senha: senhaHash,
      status: 'activo',
      email_verificado: false,
      '2fa_code': code2FA,
      foto_url: null,
      genero: null,
      data_nascimento: null,
    });
    
    const jwtSecret = process.env.JWT_SECRET || 'cm_cetroproh_password';
    const token = jwt.sign(
      { id: novoAluno.id, type: 'ALU' },
      jwtSecret, { expiresIn: '7d' }
    )
    return res.status(201).json({
      status: true,
      mensagem: 'Aluno cadastrado com sucesso! Código de verificação enviado.',
      token,
      usuario: {
        id: novoAluno.id,
        uuid: novoAluno.uuid,
        nome: novoAluno.nome,
        email: novoAluno.email,
        codigo: novoAluno.codigo,
        status: novoAluno.status,
      },
    });
  } catch (error) {
    console.error('Erro na rota de cadastro de aluno:', error);
    return res.status(500).json({
      status: false,
      mensagem: 'Erro interno no servidor ao realizar cadastro.',
    });
  }
});




router.post('/alu/login', async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();

    const { email, senha } = req.body;
    const erros = [];
    if (!email || !validator.isEmail(String(email))) {
      erros.push('Informe um e-mail válido.');
    } 
    if (!senha || typeof senha !== 'string') {
      erros.push('A senha é obrigatória.');
    }
    if (erros.length > 0) {
      return res.status(400).json({ status: false, erros });
    }
    const emailLimpo = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({
      where: {
        email: emailLimpo,
        codigo: 'ALU'
      }
    });
    if (!usuario) {
      return res.status(401).json({
        status: false,
        mensagem: 'E-mail ou senha incorretos.',
      });
    }
    if (usuario.status === 'bloqueado' || usuario.status === 'suspenso' || usuario.status === 'deletado') {
      return res.status(403).json({
        status: false,
        mensagem: `Sua conta está no status: ${usuario.status}. Entre em contato com o suporte.`,
      })
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({
        status: false,
        mensagem: 'E-mail ou senha incorretos.',
      });
    }
    const jwtSecret = process.env.JWT_SECRET || 'cm_cetroproh_password';
    const token = jwt.sign(
      {
        id: usuario.id,
        type: 'ALU'
      },
      jwtSecret,
      {
        expiresIn: '7d'
      }
    )
    return res.status(200).json({
      status: true,
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        nome: usuario.nome,
        email: usuario.email,
        codigo: usuario.codigo,
        status: usuario.status,
        email_verificado: usuario.email_verificado,
      }
    })
  } catch (error) {
    console.error('Erro na rota de login de aluno:', error);
    return res.status(500).json({
      status: false,
      mensagem: 'Erro interno no servidor ao realizar login.',
    });
  }
});




router.post('/portal/cadastro', async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const { nome, email, celular, senha } = req.body;
    if (!nome || !email || !validator.isEmail(String(email)) || !senha || senha.length < 6) {
      return res.status(400).json({ status: false, mensagem: 'Dados inválidos. Verifique os campos enviados.' });
    }
    const emailLimpo = email.trim().toLowerCase();
    const usuarioExiste = await Usuario.findOne({ where: { email: emailLimpo } });
    if (usuarioExiste) {
      return res.status(409).json({ status: false, mensagem: 'Este e-mail já está cadastrado.' });
    }
    const senhaHash = await bcrypt.hash(senha, 10);
    const code2FA = gerarCodigo2FA();
    const novoFuncionario = await Usuario.create({
      ref: null,
      codigo: null,
      nome: nome.trim(),
      email: emailLimpo,
      celular: celular ? celular.trim() : null,
      senha: senhaHash,
      status: 'verificacao',
      email_verificado: false,
      '2fa_code': code2FA,
      foto_url: null,
      genero: null,
      data_nascimento: null,
    });
    
    await sendcode(novoFuncionario.nome, novoFuncionario.email, code2FA);
    const jwtSecret = process.env.JWT_SECRET || 'cm_cetroproh_password';
    const token = jwt.sign({ id: novoFuncionario.id, type: '' }, jwtSecret, { expiresIn: '7d' });

    return res.status(201).json({
      status: true,
      mensagem: 'Cadastro realizado com sucesso! Foi enviado um código de verificação para o seu e-mail. Verifique a caixa de entrada.',
      token,
      uuid: novoFuncionario.uuid
    });

  } catch (error) {
    console.error('Erro no cadastro do portal:', error);
    return res.status(500).json({ status: false, mensagem: 'Erro interno no servidor ao processar o cadastro.' });
  }
});




router.post('/portal/login', async (req, res) => {
  try {
    await usuarioPromise
    const Usuario = getUsuarioModel()
    const { email, senha } = req.body
    if (!email || !validator.isEmail(String(email)) || !senha) {
      return res.status(400).json({
        status: false,
        mensagem: 'Por favor, informe um e-mail válido e a senha.'
      });
    }
    const emailLimpo = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ where: { email: emailLimpo } });

    if (!usuario) {
      return res.status(401).json({
        status: false,
        mensagem: 'E-mail ou senha incorretos.'
      });
    }
    if (usuario.codigo === 'ALU') {
      return res.status(403).json({
        status: false,
        mensagem: 'Acesso negado. Esta área é restrita a funcionários.'
      });
    }
    if (usuario.status === 'bloqueado' || usuario.status === 'suspenso' || usuario.status === 'deletado') {
      return res.status(403).json({
        status: false,
        mensagem: `Sua conta está no status: ${usuario.status}. Entre em contato com a administração.`
      });
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({
        status: false,
        mensagem: 'E-mail ou senha incorretos.'
      });
    }
    const rotasPorCargo = {
      'SUPERADMIN': '/superadmin',
      'COO': '/coordenacao',
      'FIN': '/financas',
      'FOR': '/formador',
      'SEC': '/secretaria',
      'MKT': '/marketing'
    }
    const codigoUsuario = usuario.codigo ? usuario.codigo.toUpperCase().trim() : null;
    const redirectUrl = rotasPorCargo[codigoUsuario] || '/nao-tem-cargo';

    const jwtSecret = process.env.JWT_SECRET || 'cm_cetroproh_password';
    const token = jwt.sign(
      {
        id: usuario.id,
        type: codigoUsuario || '',
        code: codigoUsuario || ''
      },
      jwtSecret,
      {
        expiresIn: '7d'
      }
    );
    return res.status(200).json({
      status: true,
      mensagem: 'Login realizado com sucesso!',
      token,
      redirect: redirectUrl,
    })
  } catch (error) {
    console.error('Erro no login do portal de funcionários:', error);
    return res.status(500).json({
      status: false,
      mensagem: 'Erro interno no servidor ao realizar login.'
    });
  }
});




router.post('/verificacaoemail', authMiddleware, async (req, res) => {
  try {
    const u = await (await usuarioPromise).findByPk(req.user.id);
    if (!u || String(u['2fa_code'] || '').trim().toUpperCase() !== String(req.body.code || '').trim().toUpperCase()) {
      return res.status(400).json({ status: false, mensagem: 'Código inválido.' });
    }
    await u.update({ email_verificado: true, status: 'activo', '2fa_code': null });
    return res.json({ status: true, mensagem: 'E-mail verificado com sucesso!', type: u.codigo || '' });
  } catch (e) { return res.status(500).json({ status: false, mensagem: 'Erro interno.' }); }
});




router.get('/portal/verificar-cargo', authMiddleware, async (req, res) => {
  try {
    await usuarioPromise;
    const Usuario = getUsuarioModel();
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) {
      return res.status(404).json({ status: false, mensagem: 'Usuário não encontrado.' });
    }
    const nomesCargos = {
      'SUPERADMIN': 'Administrador do Sistema',
      'COO': 'Coordenação única',
      'FIN': 'Administrador de Finanças',
      'FOR': 'Formador',
      'SEC': 'Secretaria',
      'MKT': 'Marketing'
    }
    const codigo = usuario.codigo ? usuario.codigo.toUpperCase().trim() : null;
    if (codigo && nomesCargos[codigo]) {
      return res.status(200).json({
        status: true,
        atribuido: true,
        codigo: codigo,
        nomeCargo: nomesCargos[codigo],
        mensagem: `Parabéns! Foi atribuído ao cargo de ${nomesCargos[codigo]}.`
      });
    }
    return res.status(200).json({
      status: true,
      atribuido: false,
      mensagem: 'Ainda não foi atribuído um cargo. Por favor aguarde ou entre em contacto com a secretaria.'
    });
  } catch (error) {
    console.error('Erro ao verificar cargo:', error);
    return res.status(500).json({ status: false, mensagem: 'Erro interno ao consultar cargo.' });
  }
});



async function listarTodosUsuarios() {
  try {
    await usuarioPromise; const Usuario = getUsuarioModel();
    const usuarios = await Usuario.findAll({ order: [['id', 'ASC']], attributes: ['id', 'uuid', 'nome', 'email', 'codigo', 'status', 'email_verificado'] });
    console.log('--- LISTA DE USUÁRIOS REGISTRADOS ---');
    console.table(usuarios.map(u => u.toJSON()));
    console.log(`Total de usuários: ${usuarios.length}`);
  } catch (error) { console.error('Erro ao listar usuários:', error); }
}
async function atribuirCargoPorId(id, novoCargo) {
  try {
    await usuarioPromise; const Usuario = getUsuarioModel();
    await Usuario.sequelize.query("ALTER TABLE usuarios MODIFY COLUMN codigo VARCHAR(255) NULL;");
    await Usuario.update({ codigo: novoCargo.toUpperCase().trim(), status: 'activo' }, { where: { id } });
    console.log(`Sucesso! Cargo ${novoCargo} atribuído ao usuário ID ${id}.`);
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error.message);
  }
}

// atribuirCargoPorId(12, "COOR")
//  listarTodosUsuarios()

module.exports = router