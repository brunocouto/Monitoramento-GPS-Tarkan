const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

// Configuração do sequelize com os dados do config.js
const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,
  dialect: config.database.dialect,
  logging: config.database.logging,
  timezone: config.database.timezone,
  pool: config.database.pool,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true
  }
});

/**
 * Testa a conexão com o banco de dados
 * @returns {Promise<boolean>} - Verdadeiro se a conexão for bem-sucedida
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Conexão com o banco de dados estabelecida com sucesso.');
    return true;
  } catch (error) {
    logger.error(`Erro ao conectar ao banco de dados: ${error.message}`);
    return false;
  }
}

/**
 * Sincroniza os modelos com o banco de dados
 * @param {boolean} force - Se verdadeiro, força a recriação das tabelas
 * @returns {Promise<void>}
 */
async function syncModels(force = false) {
  try {
    await sequelize.sync({ force });
    logger.info(`Modelos sincronizados ${force ? '(forçado)' : ''}`);
  } catch (error) {
    logger.error(`Erro ao sincronizar modelos: ${error.message}`);
    throw error;
  }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.syncModels = syncModels;