/**
 * Sistema de Monitoramento GPS Tarkan
 * Servidor para processamento de protocolos GPS
 */

const net = require('net');
const config = require('../config/config');
const logger = require('../utils/logger');
const protocolParser = require('./protocolParser');
const Position = require('../models/Position');
const Device = require('../models/Device');

// Armazenar conexões ativas
const activeConnections = new Map();

// Função para processar dados recebidos de dispositivos
const processData = async (data, socket) => {
  try {
    // Identificar o protocolo e extrair dados
    const result = await protocolParser.parse(data);
    
    if (!result) {
      logger.warn('Não foi possível identificar o protocolo', { 
        data: data.toString('hex'),
        remoteAddress: socket.remoteAddress 
      });
      return null;
    }
    
    const { protocol, deviceId, position } = result;
    
    // Registrar evento de recebimento
    logger.info(`Dados recebidos: ${protocol}`, { 
      deviceId,
      protocol,
      remoteAddress: socket.remoteAddress 
    });
    
    // Verificar se o dispositivo existe
    const device = await Device.findOne({ where: { uniqueId: deviceId } });
    
    if (!device) {
      logger.warn(`Dispositivo desconhecido: ${deviceId}`, { 
        protocol,
        deviceId,
        remoteAddress: socket.remoteAddress 
      });
      
      // Opcionalmente, registrar dispositivo automaticamente
      if (config.protocolServer.autoRegisterDevices) {
        await Device.create({
          uniqueId: deviceId,
          name: `Novo dispositivo (${deviceId})`,
          protocol: protocol,
          status: 'unknown',
          lastUpdate: new Date()
        });
        
        logger.info(`Dispositivo registrado automaticamente: ${deviceId}`);
      }
      
      return null;
    }
    
    // Atualizar status do dispositivo
    await device.update({
      status: position.ignition ? 'online' : 'offline',
      lastUpdate: new Date()
    });
    
    // Salvar posição
    const newPosition = await Position.create({
      deviceId: device.id,
      protocol: protocol,
      deviceTime: position.deviceTime,
      fixTime: position.fixTime,
      valid: position.valid,
      latitude: position.latitude,
      longitude: position.longitude,
      altitude: position.altitude || 0,
      speed: position.speed || 0,
      course: position.course || 0,
      address: position.address || '',
      attributes: position.attributes || {}
    });
    
    // Verificar alertas
    checkAlerts(newPosition, device);
    
    // Enviar resposta ao dispositivo se necessário
    if (result.response) {
      socket.write(result.response);
    }
    
    return newPosition;
  } catch (error) {
    logger.error('Erro ao processar dados do dispositivo', {
      error: error.message,
      stack: error.stack,
      data: data.toString('hex'),
      remoteAddress: socket.remoteAddress
    });
    return null;
  }
};

// Verificar alertas com base na posição
const checkAlerts = async (position, device) => {
  // Implementação de verificação de alertas
  // Por exemplo: verificar geofences, velocidade excessiva, etc.
  
  // Este código seria expandido com a lógica real de alertas
  try {
    // Verificar se há alertas configurados para este dispositivo
    // Processar cada tipo de alerta
    // Notificar usuários se necessário
  } catch (error) {
    logger.error('Erro ao processar alertas', {
      error: error.message,
      deviceId: device.id
    });
  }
};

// Criar servidor TCP
const startServer = () => {
  const server = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    let buffer = Buffer.alloc(0);
    
    logger.info(`Nova conexão: ${clientId}`);
    activeConnections.set(clientId, socket);
    
    // Configurar timeout
    socket.setTimeout(config.protocolServer.timeout);
    
    // Manipular dados recebidos
    socket.on('data', async (data) => {
      // Concatenar dados ao buffer
      buffer = Buffer.concat([buffer, data]);
      
      // Processar dados quando o buffer estiver pronto
      // Nota: Esta lógica pode ser mais complexa dependendo do protocolo
      if (buffer.length > 0) {
        await processData(buffer, socket);
        buffer = Buffer.alloc(0); // Limpar buffer após processamento
      }
    });
    
    // Manipular desconexão
    socket.on('close', () => {
      logger.info(`Conexão fechada: ${clientId}`);
      activeConnections.delete(clientId);
    });
    
    // Manipular timeout
    socket.on('timeout', () => {
      logger.warn(`Timeout de conexão: ${clientId}`);
      socket.end();
    });
    
    // Manipular erros
    socket.on('error', (err) => {
      logger.error(`Erro de conexão: ${clientId}`, {
        error: err.message,
        stack: err.stack
      });
      
      if (activeConnections.has(clientId)) {
        socket.destroy();
        activeConnections.delete(clientId);
      }
    });
  });
  
  // Iniciar servidor na porta configurada
  const PORT = config.protocolServer.port;
  
  server.listen(PORT, () => {
    logger.info(`Servidor de protocolo GPS iniciado na porta ${PORT}`);
    logger.info(`Protocolos suportados: ${config.protocolServer.supportedProtocols.join(', ')}`);
  });
  
  // Manipular erros do servidor
  server.on('error', (err) => {
    logger.error('Erro no servidor de protocolo', {
      error: err.message,
      stack: err.stack
    });
  });
  
  return server;
};

// Exportar funções
module.exports = {
  start: startServer,
  getActiveConnections: () => activeConnections.size
};