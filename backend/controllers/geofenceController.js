/**
 * Sistema de Monitoramento GPS Tarkan
 * Controlador de Geocercas
 */

const Geofence = require('../models/Geofence');
const Device = require('../models/Device');
const Position = require('../models/Position');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');
const { checkPermissions } = require('../utils/permissions');
const { createActivityLog } = require('../utils/activityLog');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');

/**
 * Obter todas as geocercas do usuário (com filtros)
 */
exports.getAllGeofences = async (req, res, next) => {
  try {
    const { 
      deviceId, type, active,
      search, 
      limit = 50, page = 1,
      sort = 'name'
    } = req.query;
    
    const query = { userId: req.user.id };
    
    // Filtros
    if (type) query.type = type;
    if (active !== undefined) query.active = active === 'true';
    
    // Filtrar por dispositivo
    if (deviceId) {
      query.devices = deviceId;
    }
    
    // Busca por nome ou descrição
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Contagem total para paginação
    const total = await Geofence.countDocuments(query);
    
    // Executar consulta com paginação e ordenação
    const geofences = await Geofence.find(query)
      .sort(sort.startsWith('-') ? { [sort.substring(1)]: -1 } : { [sort]: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v');
    
    // Retornar geocercas com metadados de paginação
    res.json({
      geofences,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obter uma geocerca específica pelo ID
 */
exports.getGeofenceById = async (req, res, next) => {
  try {
    const geofenceId = req.params.id;
    
    // Obter geocerca com permissões verificadas
    const geofence = await Geofence.findOne({ 
      _id: geofenceId,
      userId: req.user.id 
    }).select('-__v');
    
    if (!geofence) {
      throw new NotFoundError('Geocerca não encontrada');
    }
    
    // Obter dispositivos associados a esta geocerca
    const devices = await Device.find({
      _id: { $in: geofence.devices },
      userId: req.user.id
    }).select('name identifier type status position');
    
    // Verificar dispositivos atualmente dentro da geocerca
    const currentDevices = [];
    
    if (geofence.active) {
      // Obter últimas posições de todos os dispositivos do usuário
      const latestPositions = await Position.find({
        deviceId: { $in: devices.map(d => d._id) }
      })
      .sort({ deviceId: 1, timestamp: -1 })
      .select('deviceId latitude longitude timestamp')
      .lean();
      
      // Agrupar por dispositivo (obter apenas a posição mais recente)
      const latestPositionsByDevice = {};
      
      for (const position of latestPositions) {
        const deviceId = position.deviceId.toString();
        if (!latestPositionsByDevice[deviceId]) {
          latestPositionsByDevice[deviceId] = position;
          
          // Verificar se a posição está dentro da geocerca
          if (geofence.containsPosition(position)) {
            const device = devices.find(d => d._id.toString() === deviceId);
            if (device) {
              currentDevices.push({
                id: device._id,
                name: device.name,
                type: device.type,
                position: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  timestamp: position.timestamp
                }
              });
            }
          }
        }
      }
    }
    
    // Responder com a geocerca e dispositivos
    res.json({
      geofence,
      devices: devices.map(d => ({
        id: d._id,
        name: d.name,
        identifier: d.identifier,
        type: d.type,
        status: d.status
      })),
      currentDevices,
      isActiveNow: geofence.isActiveNow()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Criar uma nova geocerca
 */
exports.createGeofence = async (req, res, next) => {
  try {
    const {
      name, description, type, area,
      color, devices, groups, schedule,
      alerts, attributes, active
    } = req.body;
    
    // Validar campos obrigatórios específicos por tipo
    validateGeofenceByType(type, area);
    
    // Criar a geocerca
    const newGeofence = new Geofence({
      name,
      description,
      type,
      area,
      userId: req.user.id,
      color,
      devices: devices || [],
      groups: groups || [],
      schedule,
      alerts,
      attributes,
      active: active !== undefined ? active : true,
      meta: {
        createdBy: req.user.id,
        updatedBy: req.user.id
      }
    });
    
    // Salvar no banco de dados
    await newGeofence.save();
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'create',
      resource: 'geofence',
      resourceId: newGeofence._id,
      details: `Geocerca "${name}" criada`
    });
    
    // Responder com a geocerca criada
    res.status(201).json(newGeofence);
  } catch (error) {
    next(error);
  }
};

/**
 * Atualizar uma geocerca existente
 */
exports.updateGeofence = async (req, res, next) => {
  try {
    const geofenceId = req.params.id;
    const {
      name, description, type, area,
      color, devices, groups, schedule,
      alerts, attributes, active
    } = req.body;
    
    // Obter geocerca e verificar permissões
    const geofence = await Geofence.findOne({ 
      _id: geofenceId,
      userId: req.user.id 
    });
    
    if (!geofence) {
      throw new NotFoundError('Geocerca não encontrada');
    }
    
    // Se o tipo for alterado, validar campos específicos
    if (type && type !== geofence.type) {
      validateGeofenceByType(type, area);
      geofence.type = type;
      
      // Atualizar área de acordo com o novo tipo
      if (area) {
        geofence.area = area;
      } else {
        // Se não forneceu nova área, limpar a área existente
        geofence.area = {};
      }
    } 
    // Se apenas a área for alterada, validar
    else if (area) {
      validateGeofenceByType(geofence.type, area);
      geofence.area = area;
    }
    
    // Atualizar campos simples
    if (name) geofence.name = name;
    if (description !== undefined) geofence.description = description;
    if (color) geofence.color = color;
    if (devices) geofence.devices = devices;
    if (groups) geofence.groups = groups;
    if (schedule) geofence.schedule = schedule;
    if (alerts) geofence.alerts = alerts;
    if (attributes) geofence.attributes = attributes;
    if (active !== undefined) geofence.active = active;
    
    // Atualizar metadados
    geofence.meta.updatedBy = req.user.id;
    
    // Salvar alterações
    await geofence.save();
    
    // Limpar cache relacionado
    cacheService.invalidate(`geofence:${geofenceId}`);
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'update',
      resource: 'geofence',
      resourceId: geofence._id,
      details: `Geocerca "${geofence.name}" atualizada`
    });
    
    // Responder com geocerca atualizada
    res.json(geofence);
  } catch (error) {
    next(error);
  }
};

/**
 * Excluir uma geocerca
 */
exports.deleteGeofence = async (req, res, next) => {
  try {
    const geofenceId = req.params.id;
    
    // Verificar permissões
    const geofence = await Geofence.findOne({ 
      _id: geofenceId,
      userId: req.user.id 
    });
    
    if (!geofence) {
      throw new NotFoundError('Geocerca não encontrada');
    }
    
    // Excluir a geocerca
    await Geofence.deleteOne({ _id: geofenceId });
    
    // Limpar cache relacionado
    cacheService.invalidate(`geofence:${geofenceId}`);
    cacheService.invalidate(`geofences:user:${req.user.id}`);
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'delete',
      resource: 'geofence',
      resourceId: geofenceId,
      details: `Geocerca "${geofence.name}" excluída`
    });
    
    // Responder com sucesso
    res.json({ message: 'Geocerca excluída com sucesso' });
  } catch (error) {
    next(error);
  }
};

/**
 * Obter dispositivos dentro de uma geocerca específica
 */
exports.getDevicesInGeofence = async (req, res, next) => {
  try {
    const geofenceId = req.params.id;
    
    // Obter geocerca e verificar permissões
    const geofence = await Geofence.findOne({ 
      _id: geofenceId,
      userId: req.user.id 
    });
    
    if (!geofence) {
      throw new NotFoundError('Geocerca não encontrada');
    }
    
    // Verificar se a geocerca está ativa
    if (!geofence.active) {
      return res.json({
        devices: [],
        message: 'Geocerca não está ativa'
      });
    }
    
    // Obter dispositivos do usuário
    const devices = await Device.find({
      userId: req.user.id,
      disabled: { $ne: true }
    }).select('_id name identifier type position');
    
    // Obter últimas posições
    const deviceIds = devices.map(d => d._id);
    const latestPositions = await Position.find({
      deviceId: { $in: deviceIds }
    })
    .sort({ deviceId: 1, timestamp: -1 })
    .select('deviceId latitude longitude timestamp speed attributes')
    .lean();
    
    // Agrupar por dispositivo (obter apenas a posição mais recente)
    const latestPositionsByDevice = {};
    
    for (const position of latestPositions) {
      const deviceId = position.deviceId.toString();
      if (!latestPositionsByDevice[deviceId]) {
        latestPositionsByDevice[deviceId] = position;
      }
    }
    
    // Verificar quais dispositivos estão dentro da geocerca
    const devicesInGeofence = [];
    
    for (const device of devices) {
      const position = latestPositionsByDevice[device._id.toString()];
      
      if (position && geofence.containsPosition(position)) {
        devicesInGeofence.push({
          id: device._id,
          name: device.name,
          identifier: device.identifier,
          type: device.type,
          position: {
            latitude: position.latitude,
            longitude: position.longitude,
            timestamp: position.timestamp,
            speed: position.speed,
            attributes: position.attributes
          }
        });
      }
    }
    
    // Responder com dispositivos encontrados
    res.json({
      geofence: {
        id: geofence._id,
        name: geofence.name,
        type: geofence.type
      },
      devices: devicesInGeofence,
      count: devicesInGeofence.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validar geocerca com base no tipo
 */
function validateGeofenceByType(type, area) {
  if (!area) {
    throw new ValidationError('Área da geocerca é obrigatória');
  }
  
  switch (type) {
    case 'circle':
      if (!area.circle || !area.circle.center || !area.circle.radius) {
        throw new ValidationError('Geocerca do tipo círculo requer centro e raio');
      }
      break;
      
    case 'polygon':
    case 'rectangle':
      if (!area.polygon || !area.polygon.coordinates || area.polygon.coordinates.length === 0) {
        throw new ValidationError('Geocerca do tipo polígono requer coordenadas');
      }
      
      // Para retângulos, verificar se tem exatamente 4 pontos
      if (type === 'rectangle' && 
          (!area.polygon.coordinates[0] || area.polygon.coordinates[0].length !== 5)) {
        throw new ValidationError('Geocerca do tipo retângulo requer exatamente 4 vértices (5 pontos com o fechamento)');
      }
      break;
      
    case 'route':
      if (!area.route || !area.route.coordinates || area.route.coordinates.length < 2) {
        throw new ValidationError('Geocerca do tipo rota requer pelo menos 2 pontos');
      }
      
      if (!area.route.width || area.route.width < 10) {
        throw new ValidationError('Largura da rota deve ser de pelo menos 10 metros');
      }
      break;
      
    default:
      throw new ValidationError(`Tipo de geocerca inválido: ${type}`);
  }
}

module.exports = exports;