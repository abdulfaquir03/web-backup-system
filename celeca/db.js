require('dotenv').config();
const { Sequelize, DataTypes: T } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERRO CRÍTICO: A variável DATABASE_URL não está definida nas Environment Variables.');
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false,
  dialectOptions: process.env.DB_SSL === 'false' ? {} : {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const S = T.STRING, N = T.DECIMAL(14, 2), is = (...v) => ({ isIn: [v] });
const def = (nome, attrs, unicos = []) => sequelize.define(nome, attrs, {
  tableName: `celeca_${nome}`,
  indexes: unicos.map(f => ({ unique: true, fields: [f] })),
});

const Usuario = def('usuarios', {
  nome: S, email: { type: S, allowNull: false }, senha: S,
  role: { type: S, allowNull: false, validate: is('admin', 'filial', 'marketing', 'corretor') },
  status: { type: S, defaultValue: 'pendente', validate: is('pendente', 'ativo', 'bloqueado', 'suspenso') },
  provincia: S, telefone: S, cargo: S, mkt: S, parent_id: T.INTEGER, token: S, token_exp: T.DATE,
}, ['email', 'mkt']);

const Imovel = def('imoveis', {
  codigo: { type: S, allowNull: false }, slug: { type: S, allowNull: false }, titulo: S, descricao: T.TEXT,
  criador_id: T.INTEGER, filial_id: T.INTEGER,
  status: { type: S, defaultValue: 'disponivel', validate: is('disponivel', 'vendido', 'indisponivel') },
  prop_nome: S, prop_bi: S, prop_nuit: S, prop_naturalidade: S, prop_endereco: S, prop_bairro: S, prop_cidade: S, prop_telefone: S, prop_email: S,
  destino: { type: T.JSONB, defaultValue: [] },
  tipo: S, endereco: S, bairro: S, cidade: S,
  detalhes: { type: T.JSONB, defaultValue: {} }, outros: T.TEXT,
  area_construida: N, area_total: N, terreno: N,
  placa: { type: T.BOOLEAN, defaultValue: false }, jornal: { type: T.BOOLEAN, defaultValue: false },
  valor_avaliacao: N, valor_avaliacao_extenso: S, valor_venda: N, valor_venda_extenso: S,
  comissao_pct: N, comissao_valor: N, comissao_extenso: S,
  exclusividade: { type: T.BOOLEAN, defaultValue: false },
  imagens: { type: T.JSONB, defaultValue: [] },
  views: { type: T.INTEGER, defaultValue: 0 },
}, ['codigo', 'slug']);

const Lead = def('leads', {
  codigo: { type: S, allowNull: false }, nome: S, email: S, telefone: S, local: S, obs: T.TEXT, obs_interna: T.TEXT,
  status: { type: S, defaultValue: 'lead', validate: is('lead', 'atendimento', 'visita', 'proposta', 'fechamento', 'pos-venda', 'concorrencia', 'desistiu') },
  temperatura: { type: S, validate: is('frio', 'morno', 'quente') },
  ref: S, mkt_id: T.INTEGER, corretor_id: T.INTEGER, filial_id: T.INTEGER, imovel_id: T.INTEGER, valor_venda: N,
}, ['codigo']);

const fk = { constraints: false };
Lead.belongsTo(Imovel, { as: 'imovel', foreignKey: 'imovel_id', ...fk });
Lead.belongsTo(Usuario, { as: 'corretor', foreignKey: 'corretor_id', ...fk });
Imovel.belongsTo(Usuario, { as: 'criador', foreignKey: 'criador_id', ...fk });


const ready = sequelize.authenticate()
  .then(() => sequelize.sync())
  .then(() => {
    console.log('Conexão com PostgreSQL estabelecida com sucesso.');
  })
  .catch(e => {
    console.error('Erro de conexão/sincronização na base de dados:', e.message);
    throw e;
  });

module.exports = { sequelize, ready, Usuario, Imovel, Lead };