/**
 * Sistema de Monitoramento GPS Tarkan
 * Arquivo de configuração central
 */

require('dotenv').config();

module.exports = {
  // Ambiente da aplicação
  env: process.env.NODE_ENV || 'development',
  
  // Configuração do servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
  },
  
  // Configuração do banco de dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'traccar_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.DB_LOGGING === 'true',
    sync: process.env.DB_SYNC === 'true',
    forceSync: process.env.DB_FORCE_SYNC === 'true',
  },
  
  // Configuração de autenticação e segurança
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'seu_jwt_secret',
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    saltRounds: parseInt(process.env.SALT_ROUNDS || '10'),
    sessionSecret: process.env.SESSION_SECRET || 'seu_session_secret',
  },
  
  // Configuração de email
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@tarkan.com.br',
  },
  
  // Configuração de API e CORS
  api: {
    prefix: process.env.API_PREFIX || '/api',
    version: process.env.API_VERSION || 'v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  
  // Configuração de upload de arquivos
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880'), // 5MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
  },
  
  // Configuração de logs
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '7d',
  },
  
  // Configuração do protocolo
  protocol: {
    port: process.env.PROTOCOL_PORT || 5023,
    timeout: parseInt(process.env.PROTOCOL_TIMEOUT || '120000'), // 2min
  },
  
  // Configuração de localização e mapas
  location: {
    timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
    latitude: parseFloat(process.env.DEFAULT_LATITUDE || '-23.5505'),
    longitude: parseFloat(process.env.DEFAULT_LONGITUDE || '-46.6333'),
    zoom: parseInt(process.env.DEFAULT_ZOOM || '15'),
  },
  
  // Limitador de requisições (rate limiting)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  }
};