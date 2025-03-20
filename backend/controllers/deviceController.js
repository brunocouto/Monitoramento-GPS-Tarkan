/**
 * Sistema de Monitoramento GPS Tarkan
 * Controlador de Dispositivos
 */

const Device = require('../models/Device');
const Position = require('../models/Position');
const User = require('../models/User');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');
const { checkPermissions } = require('../utils/permissions');
const { createActivityLog } = require('../utils/activityLog');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');

/**
 * Obter todos os dispositivos (com filtros)
 */
exports.getAllDevices = async (req, res, next) => {
  try {
    const { 
      status, category, type, 
      search, group, 
      limit = 50, page = 1,
      sort = 'name'
    } = req.query;
    
    const query = { userId: req.user.id };
    
    // Filtros
    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;
    if (group) query.groups = group;
    
    // Busca por nome ou identificador
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } },
        { 'vehicle.plate': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Não mostrar dispositivos desativados, a menos que solicitado
    if (!req.query.showDisabled) {
      query.disabled = { $ne: true };
    }

    // Contagem total para paginação
    const total = await Device.countDocuments(query);
    
    // Executar consulta com paginação e ordenação
    const devices = await Device.find(query)
      .sort(sort.startsWith('-') ? { [sort.substring(1)]: -1 } : { [sort]: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v');
    
    // Verificar existência de posições recentes para cada dispositivo
    const deviceIds = devices.map(device => device._id);
    const recentPositions = await Position.find({
      deviceId: { $in: deviceIds },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // últimas 24h
    }).select('deviceId timestamp').sort('deviceId -timestamp');
    
    // Mapear dispositivos com status atualizado
    const devicesWithStatus = devices.map(device => {
      const deviceData = device.toObject();
      const hasRecentPosition = recentPositions.some(pos => 
        pos.deviceId.toString() === device._id.toString());
      
      // Atualizar status se o dispositivo não tiver posições recentes
      if (!hasRecentPosition && deviceData.status === 'online') {
        deviceData.status = 'offline';
      }
      
      return deviceData;
    });
    
    // Retornar dispositivos com metadados de paginação
    res.json({
      devices: devicesWithStatus,
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
 * Obter um dispositivo específico pelo ID
 */
exports.getDeviceById = async (req, res, next) => {
  try {
    const deviceId = req.params.id;
    
    // Obter dispositivo com permissões verificadas
    const device = await Device.findOne({ 
      _id: deviceId,
      userId: req.user.id 
    }).select('-__v');
    
    if (!device) {
      throw new NotFoundError('Dispositivo não encontrado');
    }
    
    // Obter última posição
    const lastPosition = await Position.findOne({ 
      deviceId: deviceId 
    }).sort('-timestamp').limit(1);
    
    // Obter estatísticas básicas
    const stats = await getDeviceStats(deviceId);
    
    // Responder com dispositivo, última posição e estatísticas
    res.json({
      device,
      lastPosition,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Criar um novo dispositivo
 */
exports.createDevice = async (req, res, next) => {
  try {
    const {
      name, identifier, type, category,
      vehicle, device: deviceInfo, settings,
      geofences, groups, customFields
    } = req.body;
    
    // Verificar se identificador já existe
    const existingDevice = await Device.findOne({ identifier });
    if (existingDevice) {
      throw new ValidationError('Um dispositivo com este identificador já existe');
    }
    
    // Criar o dispositivo
    const newDevice = new Device({
      name,
      identifier,
      type,
      category,
      userId: req.user.id,
      vehicle,
      device: deviceInfo,
      settings,
      geofences,
      groups,
      customFields,
      status: 'unknown',
      meta: {
        createdBy: req.user.id,
        updatedBy: req.user.id
      }
    });
    
    // Salvar no banco de dados
    await newDevice.save();
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'create',
      resource: 'device',
      resourceId: newDevice._id,
      details: `Dispositivo "${name}" criado`
    });
    
    // Responder com o dispositivo criado
    res.status(201).json(newDevice);
  } catch (error) {
    next(error);
  }
};

/**
 * Atualizar um dispositivo existente
 */
exports.updateDevice = async (req, res, next) => {
  try {
    const deviceId = req.params.id;
    const {
      name, type, category,
      vehicle, device: deviceInfo, settings,
      geofences, groups, customFields, disabled
    } = req.body;
    
    // Obter dispositivo e verificar permissões
    const device = await Device.findOne({ 
      _id: deviceId,
      userId: req.user.id 
    });
    
    if (!device) {
      throw new NotFoundError('Dispositivo não encontrado');
    }
    
    // Atualizar campos
    if (name) device.name = name;
    if (type) device.type = type;
    if (category) device.category = category;
    if (vehicle) device.vehicle = { ...device.vehicle, ...vehicle };
    if (deviceInfo) device.device = { ...device.device, ...deviceInfo };
    if (settings) device.settings = { ...device.settings, ...settings };
    if (geofences) device.geofences = geofences;
    if (groups) device.groups = groups;
    if (customFields) device.customFields = customFields;
    if (disabled !== undefined) device.disabled = disabled;
    
    // Atualizar metadados
    device.meta.updatedBy = req.user.id;
    
    // Salvar alterações
    await device.save();
    
    // Limpar cache relacionado
    cacheService.invalidate(`device:${deviceId}`);
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'update',
      resource: 'device',
      resourceId: device._id,
      details: `Dispositivo "${device.name}" atualizado`
    });
    
    // Responder com dispositivo atualizado
    res.json(device);
  } catch (error) {
    next(error);
  }
};

/**
 * Excluir um dispositivo
 */
exports.deleteDevice = async (req, res, next) => {
  try {
    const deviceId = req.params.id;
    
    // Verificar permissões
    const device = await Device.findOne({ 
      _id: deviceId,
      userId: req.user.id 
    });
    
    if (!device) {
      throw new NotFoundError('Dispositivo não encontrado');
    }
    
    // Excluir o dispositivo
    await Device.deleteOne({ _id: deviceId });
    
    // Limpar cache relacionado
    cacheService.invalidate(`device:${deviceId}`);
    cacheService.invalidate(`devices:user:${req.user.id}`);
    
    // Registrar atividade
    await createActivityLog({
      userId: req.user.id,
      action: 'delete',
      resource: 'device',
      resourceId: deviceId,
      details: `Dispositivo "${device.name}" excluído`
    });
    
    // Responder com sucesso
    res.json({ message: 'Dispositivo excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

/**
 * Obter estatísticas para um dispositivo
 */
async function getDeviceStats(deviceId) {
  // Calcular estatísticas básicas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Verificar última posição
  const lastPosition = await Position.findOne({ deviceId })
    .sort('-timestamp').limit(1);
  
  // Distância percorrida hoje
  const todayDistance = await Position.aggregate([
    {
      $match: {
        deviceId: mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        distance: { $sum: '$distance' }
      }
    }
  ]);
  
  // Distância percorrida este mês
  const firstDayMonth = new Date();
  firstDayMonth.setDate(1);
  firstDayMonth.setHours(0, 0, 0, 0);
  
  const monthDistance = await Position.aggregate([
    {
      $match: {
        deviceId: mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: firstDayMonth }
      }
    },
    {
      $group: {
        _id: null,
        distance: { $sum: '$distance' }
      }
    }
  ]);
  
  // Tempo de operação hoje (horas)
  const trips = await Position.aggregate([
    {
      $match: {
        deviceId: mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: today },
        speed: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: "$tripId",
        duration: {
          $sum: {
            $subtract: [
              { $ifNull: ["$endTime", new Date()] },
              "$timestamp"
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalDuration: { $sum: "$duration" }
      }
    }
  ]);
  
  return {
    lastUpdate: lastPosition ? lastPosition.timestamp : null,
    todayDistance: todayDistance.length > 0 ? todayDistance[0].distance / 1000 : 0, // km
    monthDistance: monthDistance.length > 0 ? monthDistance[0].distance / 1000 : 0, // km
    operationHours: trips.length > 0 ? trips[0].totalDuration / (1000 * 60 * 60) : 0, // horas
    status: lastPosition ? (
      (new Date() - lastPosition.timestamp < 5 * 60 * 1000) ? 'online' : 'offline'
    ) : 'unknown',
    maintenance: await getMaintenanceStatus(deviceId)
  };
}

/**
 * Obter status de manutenção para um dispositivo
 */
async function getMaintenanceStatus(deviceId) {
  const device = await Device.findById(deviceId);
  if (!device || !device.maintenance || device.maintenance.length === 0) {
    return { due: 0, upcoming: 0, items: [] };
  }
  
  const maintenanceDue = device.checkMaintenanceDue();
  
  return {
    due: maintenanceDue.filter(item => {
      // Verificar se está realmente vencido, não apenas próximo
      if (item.intervalType === 'km') {
        const nextService = item.lastServiceOdometer + item.interval;
        return currentOdometer >= nextService;
      } else if (item.intervalType === 'hours') {
        const nextService = item.lastServiceHours + item.interval;
        return currentHours >= nextService;
      } else if (item.intervalType === 'days') {
        const nextService = new Date(item.lastServiceDate);
        nextService.setDate(nextService.getDate() + item.interval);
        return now >= nextService;
      }
      return false;
    }).length,
    upcoming: maintenanceDue.length,
    items: maintenanceDue.map(item => ({
      id: item._id,
      type: item.type,
      name: item.name,
      description: item.description
    }))
  };
}

module.exports = exports;