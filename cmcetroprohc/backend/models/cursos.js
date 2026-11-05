const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

let Curso = null;

async function inicializarModeloCurso() {
  try {
    await conexaoPromise;
    const sequelize = getSequelize();

    Curso = sequelize.define('Curso', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true
      },
      nome: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      area: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      carga_horaria: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      imagem: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      taxa_inscricao: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      taxa_certificado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      preco: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
      },
      num_prestacoes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      preco_status: {
        type: DataTypes.ENUM('PENDENTE', 'DEFINIDO'),
        defaultValue: 'PENDENTE',
        allowNull: false
      },
      coo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fin_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: DataTypes.ENUM('RASCUNHO', 'ATIVO', 'INATIVO'),
        defaultValue: 'RASCUNHO',
        allowNull: false
      },
      dados_json: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false
      }
    }, {
      tableName: 'cursos',
      timestamps: true
    });

    await Curso.sync({ alter: true });
    console.log('Tabela "cursos" otimizada e sincronizada com sucesso!');

    return Curso;
  } catch (error) {
    console.error('Erro ao sincronizar a tabela "cursos":', error);
    throw error;
  }
}

const cursoPromise = inicializarModeloCurso()

module.exports = {
  getCursoModel: () => Curso,
  cursoPromise
}