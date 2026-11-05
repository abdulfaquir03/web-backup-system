const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

const CODIGOS_PERMITIDOS = ['SUPERADMIN', 'COO', 'FIN', 'FOR', 'SEC', 'MKT', 'ALU'];
const STATUS_PERMITIDOS = ['activo', 'suspenso', 'arquivado', 'bloqueado', 'deletado', 'verificacao'];
const GENEROS_PERMITIDOS = ['M', 'F', 'Outro'];

let Usuario;

async function inicializarModelo() {
  await conexaoPromise;
  const sequelize = getSequelize();

  Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    codigo: {
      type: DataTypes.ENUM(...CODIGOS_PERMITIDOS),
      allowNull: true,
      validate: {
        isIn: {
          args: [CODIGOS_PERMITIDOS],
          msg: `O código deve ser um dos seguintes valores: ${CODIGOS_PERMITIDOS.join(', ')}`,
        },
      },
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo nome é obrigatório.' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Forneça um endereço de e-mail válido.' },
        notEmpty: { msg: 'O campo e-mail é obrigatório.' },
      },
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'A senha deve conter no mínimo 6 caracteres.',
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...STATUS_PERMITIDOS),
      defaultValue: 'verificacao',
      allowNull: false,
      validate: {
        isIn: {
          args: [STATUS_PERMITIDOS],
          msg: `O status deve ser um dos seguintes valores: ${STATUS_PERMITIDOS.join(', ')}`,
        },
      },
    },
    email_verificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    '2fa_code': {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foto_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'A foto deve ser uma URL válida.' },
      },
    },
    genero: {
      type: DataTypes.ENUM(...GENEROS_PERMITIDOS),
      allowNull: true,
      validate: {
        isIn: {
          args: [GENEROS_PERMITIDOS],
          msg: `O gênero deve ser M, F ou Outro.`,
        },
      },
    },
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    perfil_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'usuarios',
    timestamps: true, 
  });

  await Usuario.sync({ alter: true });
  console.log('Tabela "usuarios" sincronizada com sucesso no banco de dados!');

  return Usuario;
}

const usuarioPromise = inicializarModelo();

module.exports = {
  getUsuarioModel: () => Usuario,
  usuarioPromise,
};

//Acima esta a minha tabela de usuarios, mas tem um problema, existem usuarios que estao reclamando de nao receber o codigo de verificação, crie uma função que vai executar no servidor, muito curta que vai filtrar os emails nao verificados e reenviar novamednte os codigos de verificação usando a nossa api do google apps script com a mesma estrutura e de log da resposta, manda a função curta aqui