/**
 * Sistema de Monitoramento GPS Tarkan
 * Arquivo principal do servidor
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Configurações
const config = require('./config/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const sequelize = require('./config/database');

// Inicializar aplicação Express
const app = express();

// Middleware de segurança e performance
app.use(helmet());
app.use(cors({
  origin: config.api.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());

// Logging de requisições
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Limitar taxa de requisições para prevenir ataques
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de rotas da API
const baseApiPath = `${config.api.prefix}/${config.api.version}`;
app.use(`${baseApiPath}/auth`, require('./routes/auth'));
app.use(`${baseApiPath}/users`, require('./routes/users'));
app.use(`${baseApiPath}/devices`, require('./routes/devices'));
app.use(`${baseApiPath}/positions`, require('./routes/positions'));
app.use(`${baseApiPath}/geofences`, require('./routes/geofences'));
app.use(`${baseApiPath}/reports`, require('./routes/reports'));
app.use(`${baseApiPath}/alerts`, require('./routes/alerts'));

// Verificação de saúde do sistema
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: config.env
  });
});

// Middleware para tratamento de erros
app.use(errorHandler);

// Inicialização do servidor
async function startServer() {
  try {
    // Testar conexão com banco de dados
    const dbConnectionOk = await sequelize.testConnection();
    if (!dbConnectionOk) {
      logger.error('Falha na conexão com o banco de dados. Verifique as configurações.');
      return;
    }
    
    // Sincronizar modelos com o banco de dados (se configurado)
    if (config.database.sync) {
      await sequelize.syncModels();
    }
    
    // Iniciar servidor HTTP
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Servidor API rodando em http://${config.server.host}:${PORT}`);
      logger.info(`Ambiente: ${config.env}`);
      logger.info(`Base API: ${baseApiPath}`);
    });
    
    // Iniciar servidor de protocolo para dispositivos GPS
    require('./services/protocolServer').start();
    
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada:', reason);
});

// Iniciar servidor
startServer();