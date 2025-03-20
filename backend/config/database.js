/**
 * Sistema de Monitoramento GPS Tarkan
 * Configuração de conexão com o banco de dados MySQL
 */

const { Sequelize } = require('sequelize');
const config = require('./config');

// Configuração do Sequelize para MySQL
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: config.database.logging ? console.log : false,
    timezone: config.timezone || '+00:00', // UTC por padrão
    define: {
      timestamps: true, // Habilitar campos createdAt e updatedAt
      underscored: true, // Usar snake_case para nomes de colunas
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    pool: {
      max: 10, // Máximo de conexões
      min: 0, // Mínimo de conexões
      acquire: 30000, // Tempo máximo para obter conexão (ms)
      idle: 10000 // Tempo máximo que uma conexão pode ficar inativa (ms)
    }
  }
);

// Função para testar conexão com banco de dados
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
};

// Função para sincronizar modelos com o banco de dados
const syncModels = async () => {
  try {
    if (config.database.sync) {
      // Em ambiente de produção, force: true é perigoso (apaga dados existentes)
      const force = config.env === 'development' && config.database.forceSync;
      
      await sequelize.sync({ force });
      console.log(`Modelos sincronizados ${force ? '(recriando tabelas)' : ''}`);
    }
  } catch (error) {
    console.error('Erro ao sincronizar modelos:', error);
    throw error;
  }
};

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.syncModels = syncModels;