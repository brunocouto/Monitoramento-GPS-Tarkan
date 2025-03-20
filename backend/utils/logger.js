/**
 * Sistema de Monitoramento GPS Tarkan
 * Configuração de logger centralizado 
 */

const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Garantir que o diretório de logs existe
const logDir = path.dirname(config.logs.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formatar mensagens de log
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Formatar mensagens para console
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Criar instância do logger
const logger = winston.createLogger({
  level: config.logs.level,
  format: logFormat,
  defaultMeta: { service: 'tarkan-gps' },
  transports: [
    // Arquivo de log para todos os níveis
    new transports.File({
      filename: config.logs.file,
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles,
      tailable: true
    }),
    
    // Arquivo separado para erros
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles
    })
  ],
  exitOnError: false
});

// Adicionar console em ambiente de desenvolvimento
if (config.env !== 'production') {
  logger.add(new transports.Console({
    format: consoleFormat
  }));
}

// Métodos adicionais para simplificar o uso
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Exportar instância do logger
module.exports = logger;