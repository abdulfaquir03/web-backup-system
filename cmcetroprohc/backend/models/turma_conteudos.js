const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

let TurmaConteudo = null;

async function inicializarModeloTurmaConteudo() {
  try {
    await conexaoPromise;
    const sequelize = getSequelize();

    TurmaConteudo = sequelize.define('TurmaConteudo', {
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
      turma_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'turmas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      formador_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      modulos_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          [
            {
              "id": 1,
              "nome": "Módulo 1: Introdução à Rede",
              "descricao": "Conceitos teóricos e práticos",
              "liberado": true,
              "data_liberacao": "2026-10-01"
            }
          ]
        */
      },
      aulas_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          [
            {
              "id": 101,
              "modulo_id": 1,
              "nome": "Aula 1: Tipos de Cabos",
              "descricao": "Prática de crimpagem",
              "duracao_min": 90,
              "video_url": null
            }
          ]
        */
      },
      materiais_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          [
            {
              "id": 1,
              "modulo_id": 1,
              "nome": "Apostila de Crimpagem.pdf",
              "url": "/uploads/materiais/turma_10_crimpagem.pdf"
            }
          ]
        */
      },
      avaliacoes_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          [
            {
              "id": 1,
              "modulo_id": 1,
              "titulo": "Prova Prática de Redes",
              "nota_max": 20,
              "texto_perguntas": "Descreva o padrão T568B...",
              "url_pdf": "/uploads/provas/prova_redes_t10.pdf",
              "data_limite": "2026-11-10T23:59:00Z"
            }
          ]
        */
      }
    }, {
      tableName: 'turma_conteudos',
      timestamps: true
    });

    await TurmaConteudo.sync({ alter: true });
    console.log('Tabela "turma_conteudos" criada e vinculada às turmas com sucesso!');

    return TurmaConteudo;
  } catch (error) {
    console.error('Erro ao sincronizar a tabela "turma_conteudos":', error);
    throw error;
  }
}

const turmaConteudoPromise = inicializarModeloTurmaConteudo();

module.exports = {
  getTurmaConteudoModel: () => TurmaConteudo,
  turmaConteudoPromise
};