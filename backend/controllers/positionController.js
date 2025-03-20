/**
 * Sistema de Monitoramento GPS Tarkan
 * Controlador de gerenciamento de posições
 */

const Position = require('../models/Position');
const Device = require('../models/Device');
const Geofence = require('../models/Geofence');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { calculateDistance, isPointInPolygon } = require('../utils/geoUtils');
const { publishPositionEvent } = require('../services/mqttService');
const redisClient = require('../config/redis');
const { checkGeofenceViolations } = require('../services/geofenceService');
const { processSpeedAlerts } = require('../services/alertService');

/**
 * Obter todas as posições com filtros
 */
exports.getPositions = async (req, res) => {
  try {
    const {
      deviceId,
      startTime,
      endTime,
      limit = 100,
      offset = 0,
      sort = 'desc'
    } = req.query;

    // Verificar permissões do usuário para os dispositivos solicitados
    const userDevices = await Device.find({ userId: req.user.id }).select('_id');
    const userDeviceIds = userDevices.map(device => device._id.toString());
    
    // Se deviceId for especificado, verificar se o usuário tem acesso a ele
    if (deviceId && !userDeviceIds.includes(deviceId)) {
      return res.status(403).json({ message: 'Acesso negado a este dispositivo' });
    }

    // Construir query
    const query = {};
    
    if (deviceId) {
      query.deviceId = deviceId;
    } else {
      query.deviceId = { $in: userDeviceIds };
    }
    
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    // Executar consulta com otimização
    const positions = await Position.find(query)
      .sort({ timestamp: sort === 'asc' ? 1 : -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Contar total de registros para paginação
    const total = await Position.countDocuments(query);

    res.status(200).json({
      data: positions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Erro ao obter posições:', error);
    res.status(500).json({ message: 'Erro ao obter posições', error: error.message });
  }
};

/**
 * Obter as posições mais recentes de todos os dispositivos do usuário
 */
exports.getLatestPositions = async (req, res) => {
  try {
    // Obter lista de dispositivos do usuário
    const userDevices = await Device.find({ userId: req.user.id }).select('_id name');
    const userDeviceIds = userDevices.map(device => device._id);

    // Buscar posições mais recentes do cache Redis
    const cachedPositions = await redisClient.mget(
      userDeviceIds.map(id => `last_position:${id}`)
    );

    let positions = [];

    // Se tiver no cache, use-o
    if (cachedPositions && cachedPositions.some(Boolean)) {
      positions = cachedPositions
        .map((pos, index) => {
          if (!pos) return null;
          try {
            const parsed = JSON.parse(pos);
            return {
              ...parsed,
              deviceName: userDevices[index].name
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    } else {
      // Falback para busca no banco de dados 
      // Usar agregação para obter a posição mais recente de cada dispositivo
      positions = await Position.aggregate([
        {
          $match: { deviceId: { $in: userDeviceIds } }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: "$deviceId",
            position: { $first: "$$ROOT" }
          }
        },
        {
          $replaceRoot: { newRoot: "$position" }
        },
        {
          $lookup: {
            from: "devices",
            localField: "deviceId",
            foreignField: "_id",
            as: "device"
          }
        },
        {
          $unwind: "$device"
        },
        {
          $project: {
            _id: 1,
            deviceId: 1,
            deviceName: "$device.name",
            latitude: 1,
            longitude: 1,
            altitude: 1,
            speed: 1,
            course: 1,
            timestamp: 1,
            attributes: 1
          }
        }
      ]);

      // Armazenar resultados no Redis para futuras consultas
      positions.forEach(position => {
        redisClient.set(
          `last_position:${position.deviceId}`, 
          JSON.stringify(position),
          'EX', 
          60 // TTL de 60 segundos
        );
      });
    }

    res.status(200).json(positions);
  } catch (error) {
    logger.error('Erro ao obter posições recentes:', error);
    res.status(500).json({ message: 'Erro ao obter posições recentes', error: error.message });
  }
};

/**
 * Obter posições por dispositivo
 */
exports.getPositionsByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startTime, endTime, limit = 100, offset = 0 } = req.query;

    // Verificar se o usuário tem acesso ao dispositivo
    const device = await Device.findOne({ _id: deviceId, userId: req.user.id });
    
    if (!device) {
      return res.status(403).json({ message: 'Acesso negado a este dispositivo' });
    }

    // Construir query
    const query = { deviceId };
    
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    const positions = await Position.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Position.countDocuments(query);

    res.status(200).json({
      data: positions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Erro ao obter posições do dispositivo ${req.params.deviceId}:`, error);
    res.status(500).json({ 
      message: `Erro ao obter posições do dispositivo ${req.params.deviceId}`, 
      error: error.message 
    });
  }
};

/**
 * Obter histórico de posições para análise de rotas
 */
exports.getPositionHistory = async (req, res) => {
  try {
    const { deviceId, startTime, endTime, includeAttributes } = req.query;
    
    if (!deviceId || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Parâmetros incompletos. deviceId, startTime e endTime são obrigatórios.' 
      });
    }

    // Verificar se o usuário tem acesso ao dispositivo
    const device = await Device.findOne({ _id: deviceId, userId: req.user.id });
    
    if (!device) {
      return res.status(403).json({ message: 'Acesso negado a este dispositivo' });
    }

    // Aplicar otimização de consulta conforme volume de dados
    const timeDiff = new Date(endTime) - new Date(startTime);
    const isLargeTimeRange = timeDiff > 86400000 * 3; // > 3 dias
    
    // Para grandes intervalos, aplica amostragem
    let positions;
    if (isLargeTimeRange) {
      // Calcular intervalo de amostragem (1 ponto a cada X minutos)
      const samplingInterval = Math.max(5, Math.floor(timeDiff / (86400000 * 500))); // Máximo 500 pontos por dia
      
      // Consulta otimizada com amostragem
      positions = await Position.aggregate([
        {
          $match: {
            deviceId,
            timestamp: {
              $gte: new Date(startTime),
              $lte: new Date(endTime)
            }
          }
        },
        {
          $sort: { timestamp: 1 }
        },
        {
          $group: {
            _id: {
              deviceId: "$deviceId",
              interval: {
                $subtract: [
                  { $toLong: "$timestamp" },
                  { $mod: [{ $toLong: "$timestamp" }, samplingInterval * 60000] }
                ]
              }
            },
            position: { $first: "$$ROOT" }
          }
        },
        {
          $replaceRoot: { newRoot: "$position" }
        },
        {
          $project: includeAttributes 
            ? { 
                _id: 1, 
                deviceId: 1, 
                latitude: 1, 
                longitude: 1, 
                altitude: 1, 
                speed: 1, 
                course: 1, 
                timestamp: 1, 
                attributes: 1 
              }
            : { 
                _id: 1, 
                deviceId: 1, 
                latitude: 1, 
                longitude: 1, 
                speed: 1, 
                timestamp: 1 
              }
        }
      ]);
    } else {
      // Para intervalos menores, retorna todos os pontos
      const projection = includeAttributes 
        ? { 
            _id: 1, 
            deviceId: 1, 
            latitude: 1, 
            longitude: 1, 
            altitude: 1, 
            speed: 1, 
            course: 1, 
            timestamp: 1, 
            attributes: 1 
          }
        : { 
            _id: 1, 
            deviceId: 1, 
            latitude: 1, 
            longitude: 1, 
            speed: 1, 
            timestamp: 1 
          };
      
      positions = await Position.find({
        deviceId,
        timestamp: {
          $gte: new Date(startTime),
          $lte: new Date(endTime)
        }
      })
      .select(projection)
      .sort({ timestamp: 1 });
    }

    // Calcula estatísticas
    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;
    let movingTime = 0;
    let stoppedTime = 0;
    let lastPosition = null;
    let speedSum = 0;
    let pointCount = positions.length;

    positions.forEach((pos, index) => {
      // Atualizar estatísticas
      speedSum += pos.speed || 0;
      maxSpeed = Math.max(maxSpeed, pos.speed || 0);
      
      // Calcular distância entre pontos consecutivos
      if (lastPosition) {
        const distance = calculateDistance(
          lastPosition.latitude, 
          lastPosition.longitude,
          pos.latitude,
          pos.longitude
        );
        
        totalDistance += distance;
        
        // Calcular tempo em movimento vs parado
        const timeGap = new Date(pos.timestamp) - new Date(lastPosition.timestamp);
        if (pos.speed > 1) { // Considerado em movimento se velocidade > 1 km/h
          movingTime += timeGap;
        } else {
          stoppedTime += timeGap;
        }
      }
      
      lastPosition = pos;
    });

    // Calcular velocidade média apenas se houver pontos
    avgSpeed = pointCount > 0 ? speedSum / pointCount : 0;

    res.status(200).json({
      data: positions,
      statistics: {
        totalPoints: pointCount,
        totalDistance: totalDistance.toFixed(2), // em km
        maxSpeed: maxSpeed.toFixed(2), // km/h
        avgSpeed: avgSpeed.toFixed(2), // km/h
        movingTime: Math.floor(movingTime / 1000 / 60), // em minutos
        stoppedTime: Math.floor(stoppedTime / 1000 / 60), // em minutos
        totalTime: Math.floor((movingTime + stoppedTime) / 1000 / 60) // em minutos
      }
    });
  } catch (error) {
    logger.error('Erro ao obter histórico de posições:', error);
    res.status(500).json({ message: 'Erro ao obter histórico de posições', error: error.message });
  }
};

/**
 * Criar nova posição (recebida do dispositivo)
 */
exports.createPosition = async (req, res) => {
  try {
    const { deviceId, protocol, latitude, longitude, altitude, speed, course, timestamp, attributes } = req.body;
    
    // Validar dados de entrada
    if (!deviceId || !latitude || !longitude) {
      return res.status(400).json({ message: 'Dados incompletos da posição' });
    }

    // Verificar se o dispositivo existe
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Dispositivo não encontrado' });
    }

    // Criar nova posição
    const position = new Position({
      deviceId,
      protocol: protocol || 'api',
      latitude,
      longitude,
      altitude: altitude || 0,
      speed: speed || 0,
      course: course || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      attributes: attributes || {}
    });

    // Salvar posição
    const savedPosition = await position.save();

    // Atualizar status do dispositivo
    device.lastUpdate = new Date();
    device.status = 'online';
    device.position = {
      latitude,
      longitude,
      altitude: altitude || 0,
      speed: speed || 0,
      course: course || 0
    };
    await device.save();

    // Salvar última posição no Redis para acesso rápido
    await redisClient.set(
      `last_position:${deviceId}`,
      JSON.stringify(savedPosition),
      'EX',
      60 // TTL de 60 segundos
    );

    // Publicar evento de nova posição via MQTT
    publishPositionEvent(device.userId, savedPosition);

    // Processar verificações de geocercas
    const geofenceResults = await checkGeofenceViolations(savedPosition);
    
    // Processar alertas de velocidade
    const speedAlerts = await processSpeedAlerts(savedPosition, device);

    // Combinar todos os alertas
    const allAlerts = [...geofenceResults, ...speedAlerts];

    res.status(201).json({ 
      message: 'Posição criada com sucesso',
      data: savedPosition,
      alerts: allAlerts.length > 0 ? allAlerts : undefined
    });
  } catch (error) {
    logger.error('Erro ao criar posição:', error);
    res.status(500).json({ message: 'Erro ao criar posição', error: error.message });
  }
};

/**
 * Criar múltiplas posições em lote
 */
exports.createBatchPositions = async (req, res) => {
  try {
    const { positions } = req.body;
    
    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json({ message: 'Formato inválido. Deve fornecer um array de posições.' });
    }

    // Validar posições e preparar para inserção
    const validPositions = positions.filter(pos => 
      pos.deviceId && 
      typeof pos.latitude === 'number' && 
      typeof pos.longitude === 'number'
    );

    if (validPositions.length === 0) {
      return res.status(400).json({ message: 'Nenhuma posição válida fornecida.' });
    }

    // Normalizar registros
    const normalizedPositions = validPositions.map(pos => ({
      deviceId: pos.deviceId,
      protocol: pos.protocol || 'api',
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude || 0,
      speed: pos.speed || 0,
      course: pos.course || 0,
      timestamp: pos.timestamp ? new Date(pos.timestamp) : new Date(),
      attributes: pos.attributes || {}
    }));

    // Inserir posições em lote
    const insertedPositions = await Position.insertMany(normalizedPositions);

    // Agrupar posições por dispositivo e atualizar apenas as mais recentes
    const deviceUpdates = {};
    normalizedPositions.forEach(pos => {
      const timestamp = new Date(pos.timestamp);
      if (!deviceUpdates[pos.deviceId] || 
          timestamp > new Date(deviceUpdates[pos.deviceId].timestamp)) {
        deviceUpdates[pos.deviceId] = pos;
      }
    });

    // Atualizar status dos dispositivos
    const devicePromises = Object.entries(deviceUpdates).map(async ([deviceId, pos]) => {
      await Device.findByIdAndUpdate(deviceId, {
        lastUpdate: new Date(),
        status: 'online',
        position: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          altitude: pos.altitude,
          speed: pos.speed,
          course: pos.course
        }
      });

      // Atualizar cache Redis
      const posToCache = insertedPositions.find(p => 
        p.deviceId.toString() === deviceId && 
        new Date(p.timestamp).getTime() === new Date(pos.timestamp).getTime()
      );
      
      if (posToCache) {
        await redisClient.set(
          `last_position:${deviceId}`,
          JSON.stringify(posToCache),
          'EX',
          60 // TTL de 60 segundos
        );
      }
    });

    await Promise.all(devicePromises);

    // Processar verificações em background para não atrasar a resposta
    processBackgroundChecks(insertedPositions);

    res.status(201).json({ 
      message: `${insertedPositions.length} posições criadas com sucesso`,
      created: insertedPositions.length,
      rejected: positions.length - validPositions.length
    });
  } catch (error) {
    logger.error('Erro ao criar posições em lote:', error);
    res.status(500).json({ message: 'Erro ao criar posições em lote', error: error.message });
  }
};

/**
 * Função auxiliar para processar verificações em background
 */
async function processBackgroundChecks(positions) {
  try {
    // Obter IDs únicos de dispositivos
    const deviceIds = [...new Set(positions.map(pos => pos.deviceId.toString()))];
    
    // Buscar dispositivos para obter IDs de usuários
    const devices = await Device.find({ _id: { $in: deviceIds } }).select('_id userId');
    const deviceMap = devices.reduce((map, device) => {
      map[device._id.toString()] = device;
      return map;
    }, {});

    // Para cada posição, processar verificações e publicar eventos
    for (const position of positions) {
      const device = deviceMap[position.deviceId.toString()];
      if (device) {
        // Publicar evento via MQTT
        publishPositionEvent(device.userId, position);
        
        // Verificar geocercas e alertas
        await checkGeofenceViolations(position);
        await processSpeedAlerts(position, device);
      }
    }
  } catch (error) {
    logger.error('Erro ao processar verificações em background:', error);
  }
}