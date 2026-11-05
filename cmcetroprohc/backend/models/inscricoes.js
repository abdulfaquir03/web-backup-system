const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

let Inscricao = null;

async function inicializarModeloInscricao() {
  try {
    await conexaoPromise;
    const sequelize = getSequelize();

    Inscricao = sequelize.define('Inscricao', {
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
      codigo_inscricao: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      aluno_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      turma_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'turmas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      curso_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cursos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: {
        type: DataTypes.ENUM('PENDENTE', 'ATIVA', 'CONCLUIDA', 'CANCELADA', 'TRANCADA'),
        defaultValue: 'PENDENTE',
        allowNull: false
      },
      valor_actual: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false
      },
      status_pagamento: {
        type: DataTypes.ENUM('PENDENTE', 'EM_DIA', 'QUITADO'),
        defaultValue: 'PENDENTE',
        allowNull: false
      },
      mensalidades_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          Estrutura esperada:
          [
            {
              "n_prestacao": 1,
              "status": "PAGO", // PENDENTE, EM_ANALISE, PAGO
              "comprovativo": "/uploads/comprovantes/prestacao_1.png",
              "data_pagamento": "2026-10-05",
              "validado_por_fin": 3
            }
          ]
        */
      },
      presencas_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          [
            {
              "id": 1,
              "data": "2026-10-01",
              "presente": true,
              "registado_por": 2
            }
          ]
        */
      },
      desempenho_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          aulas_completadas: [],
          progresso_porcentagem: 0,
          nota_final: null
        }
      },
      avaliacoes_submetidas_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
        /*
          Estrutura esperada:
          [
            {
              "avaliacao_id": 1, // ID da avaliação na tabela cursos
              "modulo_id": 1,
              "arquivo_resposta_url": "/uploads/avaliacoes_aluno/prova_mod1_aluno10.pdf",
              "data_submissao": "2026-10-15T10:30:00Z",
              "status": "EM_AVALIACAO", // PENDENTE, EM_AVALIACAO, AVALIADO, REJEITADO
              "nota_obtida": 18, // Preenchido pelo professor
              "observacao_professor": "Excelente resolução, atenção apenas à questão 2.",
              "corrigido_por": 2, // ID do professor
              "data_correcao": "2026-10-16T14:00:00Z"
            }
          ]
        */
      },
      certificado_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          taxa_paga: false,
          comprovativo_taxa: null,
          validado_por_fin: null,
          apto_para_levantar: false,
          status_emissao: 'NAO_SOLICITADO', // NAO_SOLICITADO, PENDENTE_PAGAMENTO, EM_PROCESSAMENTO, EMITIDO, ENTREGUE
          codigo_autenticacao: null,
          data_emissao: null
        }
      },
      inscricao_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          paga: false,
          em_verificacao: false,
          status: 'PENDENTE', // PENDENTE, EM_VERIFICACAO, APROVADO, REJEITADO
          comprovativo: null,
          data_submissao: null,
          data_aprovacao: null,
          validado_por_fin: null,
          motivo_rejeicao: null
        }
      }
    }, {
      tableName: 'inscricoes',
      timestamps: true
    });

    await Inscricao.sync({ alter: true });
    console.log('Tabela "inscricoes" atualizada com o campo "inscricao_json"!');

    return Inscricao;
  } catch (error) {
    console.error('Erro ao sincronizar a tabela "inscricoes":', error);
    throw error;
  }
}

const inscricaoPromise = inicializarModeloInscricao();

module.exports = {
  getInscricaoModel: () => Inscricao,
  inscricaoPromise
};