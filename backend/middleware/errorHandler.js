/**
 * Sistema de Monitoramento GPS Tarkan
 * Middleware para tratamento centralizado de erros
 */

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Campo inválido: ${err.path}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Campo duplicado: ${value}. Por favor use outro valor.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Dados inválidos: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Token inválido. Por favor faça login novamente.', 401);

const handleJWTExpiredError = () => new AppError('Token expirado. Por favor faça login novamente.', 401);

// Erro para ambiente de desenvolvimento (detalhado)
const sendErrorDev = (err, res) => {
  logger.error(`DEV ERROR: ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode
  });
  
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Erro para ambiente de produção (menos detalhado)
const sendErrorProd = (err, res) => {
  // Erros operacionais são esperados e podem ser mostrados ao cliente
  if (err.isOperational) {
    logger.warn(`PROD ERROR: ${err.message}`, {
      statusCode: err.statusCode
    });
    
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Erros de programação ou outros erros desconhecidos
    logger.error(`PROD UNEXPECTED ERROR: ${err.message}`, {
      stack: err.stack,
      statusCode: err.statusCode || 500
    });
    
    // Não vazamos detalhes para o cliente
    res.status(500).json({
      status: 'error',
      message: 'Algo deu errado'
    });
  }
};

// Middleware de tratamento de erros
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    // Tratar erros específicos do Mongoose/MySQL
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

// Exportar classe de erro personalizada
module.exports.AppError = AppError;