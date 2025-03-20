/**
 * Módulo de integração com o servidor Traccar
 * 
 * Este módulo fornece funções para integração com a API do servidor Traccar,
 * permitindo a comunicação entre o sistema Monitoramento GPS Tarkan e o servidor Traccar.
 * 
 * @module services/traccarIntegration
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config/config');

// Configuração do cliente Axios para o Traccar
const traccarAPI = axios.create({
  baseURL: config.traccar.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${config.traccar.user}:${config.traccar.password}`).toString('base64')}`
  }
});

/**
 * Sincroniza os dispositivos do Traccar com o banco de dados local
 * @param {Object} models - Modelos Sequelize
 * @returns {Promise<Array>} - Lista de dispositivos sincronizados
 */
const syncDevices = async (models) => {
  try {
    logger.info('Iniciando sincronização de dispositivos com Traccar');
    
    // Buscar dispositivos no Traccar
    const response = await traccarAPI.get('/devices');
    const traccarDevices = response.data;
    
    logger.info(`Encontrados ${traccarDevices.length} dispositivos no Traccar`);
    
    // Para cada dispositivo do Traccar, atualizar ou criar no banco local
    const syncPromises = traccarDevices.map(async (traccarDevice) => {
      const [device, created] = await models.Device.findOrCreate({
        where: { uniqueId: traccarDevice.uniqueId },
        defaults: {
          name: traccarDevice.name,
          status: traccarDevice.status,
          lastUpdate: traccarDevice.lastUpdate,
          traccarId: traccarDevice.id
        }
      });
      
      // Se o dispositivo já existir, atualizar seus dados
      if (!created) {
        await device.update({
          name: traccarDevice.name,
          status: traccarDevice.status,
          lastUpdate: traccarDevice.lastUpdate,
          traccarId: traccarDevice.id
        });
      }
      
      return device;
    });
    
    const syncedDevices = await Promise.all(syncPromises);
    logger.info('Sincronização de dispositivos com Traccar concluída');
    
    return syncedDevices;
  } catch (error) {
    logger.error(`Erro ao sincronizar dispositivos com Traccar: ${error.message}`);
    throw new Error(`Falha na sincronização com Traccar: ${error.message}`);
  }
};

/**
 * Sincroniza as posições do Traccar com o banco de dados local
 * @param {Object} models - Modelos Sequelize
 * @param {Date} [from] - Data de início para sincronização
 * @returns {Promise<Array>} - Lista de posições sincronizadas
 */
const syncPositions = async (models, from = null) => {
  try {
    logger.info('Iniciando sincronização de posições com Traccar');
    
    // Configurar parâmetros da requisição
    let params = {};
    if (from) {
      params.from = from.toISOString();
    } else {
      // Se não for fornecida data, sincronizar as últimas 24 horas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      params.from = yesterday.toISOString();
    }
    
    // Buscar posições no Traccar
    const response = await traccarAPI.get('/positions', { params });
    const traccarPositions = response.data;
    
    logger.info(`Encontradas ${traccarPositions.length} posições no Traccar`);
    
    // Para cada posição do Traccar, criar no banco local se não existir
    const syncPromises = traccarPositions.map(async (pos) => {
      // Buscar o device correspondente no banco local
      const device = await models.Device.findOne({
        where: { traccarId: pos.deviceId }
      });
      
      if (!device) {
        logger.warn(`Dispositivo com traccarId ${pos.deviceId} não encontrado no banco local`);
        return null;
      }
      
      // Verificar se a posição já existe
      const existingPosition = await models.Position.findOne({
        where: {
          deviceId: device.id,
          timestamp: new Date(pos.fixTime)
        }
      });
      
      if (existingPosition) {
        return existingPosition;
      }
      
      // Criar nova posição
      const position = await models.Position.create({
        deviceId: device.id,
        protocol: pos.protocol || 'unknown',
        timestamp: new Date(pos.fixTime),
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        speed: pos.speed,
        course: pos.course,
        address: pos.address,
        attributes: JSON.stringify(pos.attributes || {})
      });
      
      return position;
    });
    
    const syncedPositions = await Promise.all(syncPromises);
    const validPositions = syncedPositions.filter(pos => pos !== null);
    
    logger.info(`Sincronização de posições concluída. ${validPositions.length} posições sincronizadas`);
    
    return validPositions;
  } catch (error) {
    logger.error(`Erro ao sincronizar posições com Traccar: ${error.message}`);
    throw new Error(`Falha na sincronização de posições: ${error.message}`);
  }
};

/**
 * Envia um comando para um dispositivo através do Traccar
 * @param {Object} device - Objeto do dispositivo
 * @param {string} type - Tipo de comando
 * @param {Object} attributes - Atributos do comando
 * @returns {Promise<Object>} - Resposta do comando
 */
const sendCommand = async (device, type, attributes = {}) => {
  try {
    if (!device.traccarId) {
      throw new Error('Dispositivo não possui ID do Traccar');
    }
    
    const command = {
      deviceId: device.traccarId,
      type,
      attributes
    };
    
    logger.info(`Enviando comando ${type} para dispositivo ${device.uniqueId}`);
    
    const response = await traccarAPI.post('/commands/send', command);
    
    logger.info(`Comando enviado com sucesso para ${device.uniqueId}`);
    return response.data;
  } catch (error) {
    logger.error(`Erro ao enviar comando para dispositivo ${device.uniqueId}: ${error.message}`);
    throw new Error(`Falha ao enviar comando: ${error.message}`);
  }
};

/**
 * Obtém o status de conexão com o servidor Traccar
 * @returns {Promise<Object>} - Status da conexão
 */
const getServerStatus = async () => {
  try {
    const response = await traccarAPI.get('/server');
    return {
      connected: true,
      version: response.data.version,
      timezone: response.data.timezone
    };
  } catch (error) {
    logger.error(`Erro ao verificar status do servidor Traccar: ${error.message}`);
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = {
  syncDevices,
  syncPositions,
  sendCommand,
  getServerStatus
};