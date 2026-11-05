const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

let Turma = null;

async function inicializarModeloTurma() {
  try {
    await conexaoPromise;
    const sequelize = getSequelize();

    Turma = sequelize.define('Turma', {
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
        type: DataTypes.STRING(100),
        allowNull: false
      },
      coo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      formador_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      modalidade: {
        type: DataTypes.ENUM('PRESENCIAL', 'ONLINE', 'HIBRIDO'),
        defaultValue: 'PRESENCIAL',
        allowNull: false
      },
      local_sala: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vagas_totais: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false
      },
      vagas_preenchidas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      data_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      data_fim: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      horario: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('PLANEADA', 'INSCRICOES_ABERTAS', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'),
        defaultValue: 'PLANEADA',
        allowNull: false
      }
    }, {
      tableName: 'turmas',
      timestamps: true
    });

    await Turma.sync();
    console.log('Tabela "turmas" sincronizada com sucesso no banco de dados!');

    return Turma;
  } catch (error) {
    console.error('Erro ao sincronizar a tabela "turmas":', error);
    throw error;
  }
}

const turmaPromise = inicializarModeloTurma()

module.exports = {
  getTurmaModel: () => Turma,
  turmaPromise
}