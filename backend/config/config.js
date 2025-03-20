/**
 * Configurações globais da aplicação 
 * 
 * Este arquivo contém as configurações gerais da aplicação, 
 * incluindo configurações do servidor, banco de dados, e integrações.
 * 
 * As configurações são carregadas a partir de variáveis de ambiente
 * definidas no arquivo .env na raiz do projeto.
 */

require('dotenv').config();

module.exports = {
  // Configuração do ambiente
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  
  // Configuração do servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // Configuração do banco de dados MySQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tarkan_gps',
    dialect: 'mysql',
    logging: process.env.NODE_ENV !== 'production' ? console.log : false,
    timezone: process.env.DB_TIMEZONE || 'America/Sao_Paulo',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // Configuração do JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'tarkan-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Configuração de logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || 5
  },
  
  // Integração com o servidor Traccar
  traccar: {
    enabled: process.env.TRACCAR_ENABLED === 'true' || false,
    apiUrl: process.env.TRACCAR_API_URL || 'http://localhost:8082/api',
    user: process.env.TRACCAR_USER || 'admin',
    password: process.env.TRACCAR_PASSWORD || 'admin',
    // Intervalo de sincronização em milissegundos (padrão: 5 minutos)
    syncInterval: parseInt(process.env.TRACCAR_SYNC_INTERVAL || 300000, 10)
  },
  
  // Configurações de e-mail
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true' || false,
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || ''
    },
    from: process.env.EMAIL_FROM || 'noreply@tarkan.com.br'
  },
  
  // Configurações de geocodificação
  geocoding: {
    enabled: process.env.GEOCODING_ENABLED === 'true' || false,
    provider: process.env.GEOCODING_PROVIDER || 'google',
    apiKey: process.env.GEOCODING_API_KEY || '',
    // Cache de geocodificação em segundos (padrão: 1 semana)
    cacheTime: parseInt(process.env.GEOCODING_CACHE_TIME || 604800, 10)
  },
  
  // Configurações de notificações
  notifications: {
    // Tempo entre notificações do mesmo tipo (evita spam)
    throttleTime: parseInt(process.env.NOTIFICATION_THROTTLE_TIME || 300000, 10)
  },
  
  // Configurações de segurança
  security: {
    // Número de tentativas de login antes de bloqueio
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5, 10),
    // Tempo de bloqueio em segundos após exceder tentativas
    lockTime: parseInt(process.env.LOCK_TIME || 1800, 10),
    // Exigir senha forte (pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos)
    requireStrongPassword: process.env.REQUIRE_STRONG_PASSWORD === 'true' || true,
    // Tempo para expiração da sessão em segundos (padrão: 24 horas)
    sessionExpire: parseInt(process.env.SESSION_EXPIRE || 86400, 10)
  },
  
  // Configurações da API
  api: {
    // Número máximo de registros por página
    maxPageSize: parseInt(process.env.API_MAX_PAGE_SIZE || 1000, 10),
    // Número padrão de registros por página
    defaultPageSize: parseInt(process.env.API_DEFAULT_PAGE_SIZE || 50, 10),
    // Caminho base da API
    basePath: process.env.API_BASE_PATH || '/api',
    // Versão da API
    version: process.env.API_VERSION || 'v1',
    // Permitir CORS
    allowCors: process.env.API_ALLOW_CORS === 'true' || true,
    // Limitar requisições (limite por IP/minuto)
    rateLimit: parseInt(process.env.API_RATE_LIMIT || 100, 10)
  }
};