/**
 * Sistema de Monitoramento GPS Tarkan
 * Configurações centralizadas do sistema
 */

require('dotenv').config();

// Exportar configurações
module.exports = {
  // Ambiente
  env: process.env.NODE_ENV || 'development',
  
  // Configurações do servidor web
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    bodyLimit: process.env.BODY_LIMIT || '100kb',
  },
  
  // Configurações da API
  api: {
    prefix: '/api',
    version: 'v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  
  // Configurações do banco de dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'traccar_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development',
    sync: process.env.DB_SYNC === 'true',
  },
  
  // JWT para autenticação
  jwt: {
    secret: process.env.JWT_SECRET || 'sua-chave-secreta-padrao',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Configurações para limitação de taxa
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limite de 100 requisições por janela
  },
  
  // Configurações do receptor de protocolos GPS
  protocolServer: {
    port: parseInt(process.env.PROTOCOL_PORT || '5023', 10),
    supportedProtocols: ['tk103', 'gt06', 'h02', 'coban', 'teltonika'],
    bufferSize: parseInt(process.env.PROTOCOL_BUFFER_SIZE || '1024', 10),
    timeout: parseInt(process.env.PROTOCOL_TIMEOUT || '60000', 10), // 60 segundos
  },
  
  // Configurações para logs
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
  },
  
  // Configurações para alertas e notificações
  notifications: {
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
      from: process.env.EMAIL_FROM || 'noreply@tarkan.com.br',
    },
    sms: {
      enabled: process.env.SMS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      accountSid: process.env.SMS_ACCOUNT_SID || '',
      authToken: process.env.SMS_AUTH_TOKEN || '',
      from: process.env.SMS_FROM || '',
    },
  },
};