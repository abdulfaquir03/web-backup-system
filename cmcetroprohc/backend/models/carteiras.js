const { DataTypes } = require('sequelize');
const { getSequelize, conexaoPromise } = require('./db');

let CarteiraPagamentoModel = null;

async function inicializarModeloCarteiraPagamento() {
  await conexaoPromise;
  const sequelize = getSequelize();

  if (!CarteiraPagamentoModel) {
    CarteiraPagamentoModel = sequelize.define('CarteiraPagamento', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fin_id: { type: DataTypes.INTEGER, allowNull: false }, // Gestor da carteira
      nome_banco: { type: DataTypes.STRING, allowNull: false }, // Ex: M-Pesa, e-Mola, BIM, BCI
      titular: { type: DataTypes.STRING, allowNull: false },
      numero_conta: { type: DataTypes.STRING, allowNull: false },
      descricao: { type: DataTypes.STRING, allowNull: true },
      
      destinado_a: {
        type: DataTypes.ENUM('TODOS', 'MEUS_CURSOS'),
        defaultValue: 'TODOS',
        allowNull: false
      },

      aprovacao_regras: {
        type: DataTypes.ENUM('TODOS_OPERADORES', 'APENAS_CRIADOR'),
        defaultValue: 'APENAS_CRIADOR',
        allowNull: false
      },

      saldo_total: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },

      status: {
        type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'INATIVO'),
        defaultValue: 'PENDENTE',
        allowNull: false
      },
      aprovado_por: { type: DataTypes.INTEGER, allowNull: true },

      transacoes_json: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false
        /* Estrutura de cada item dentro do Array transacoes_json:
          {
            tx_id: "TX-9812739812",
            aluno_id: 12,
            inscricao_id: 5,
            conteudo: "taxa_inscricao" | "prestacao_1" | "taxa_certificado" | "outros",
            valor: 300.00,
            comprovativo_url: "/uploads/comprovativos/comp_123.png",
            status: "PENDENTE" | "EM_VERIFICACAO" | "APROVADO" | "REJEITADO",
            motivo_rejeicao: "Comprovativo ilegível ou valor divergente.",
            processado_por: 7, // ID do operador financeiro que validou
            data_submissao: "2026-10-07T04:30:00Z",
            data_validacao: "2026-10-07T05:10:00Z"
          }
        */
      },

      meta_dados_json: {
        type: DataTypes.JSONB,
        defaultValue: {
          instrucoes_pagamento: "Usar o código de inscrição como referência na transferência.",
          limite_diario_recebimento: null
        }
      }
    }, {
      tableName: 'carteiras_pagamento',
      timestamps: true
    });

    await CarteiraPagamentoModel.sync({ alter: true });
  }

  return CarteiraPagamentoModel;
}

const carteiraPagamentoPromise = inicializarModeloCarteiraPagamento();

module.exports = {
  getCarteiraPagamentoModel: () => CarteiraPagamentoModel,
  carteiraPagamentoPromise
};