const path = require('path');
const { Sequelize } = require('sequelize');

require('pg');
require('pg-hstore');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let sequelize;

async function conectar() {
  let pgUri = process.env.DB_POSTGRE;

  if (!pgUri) {
    console.error('Erro: A variável DB_POSTGRE não foi encontrada nas variáveis de ambiente da Vercel.');
    process.exit(1);
  }
  if (pgUri.includes('sslmode=require')) {
    pgUri = pgUri.replace('sslmode=require', 'sslmode=verify-full');
  }

  try {
    const postgresSequelize = new Sequelize(pgUri, {
      dialect: 'postgres',
      dialectModule: require('pg'),
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    await postgresSequelize.authenticate();
    console.log('Conectado com sucesso ao PostgreSQL (Vercel)!');
    return (sequelize = postgresSequelize);
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL na Vercel:', err.message);
    process.exit(1);
  }
}

const conexaoPromise = conectar();

module.exports = {
  getSequelize: () => sequelize,
  conexaoPromise,
};