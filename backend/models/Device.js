/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Dispositivo (rastreador/veículo)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  // Informações básicas do dispositivo
  name: {
    type: String,
    required: true,
    trim: true
  },
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Tipo de dispositivo/veículo
  type: {
    type: String,
    enum: ['car', 'truck', 'motorcycle', 'bus', 'boat', 'asset', 'person', 'other'],
    default: 'car'
  },
  // Categoria (para fins de relatório e agrupamento)
  category: {
    type: String,
    default: 'default'
  },
  // Proprietário do dispositivo
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Informações do veículo
  vehicle: {
    model: String,
    make: String,
    year: Number,
    color: String,
    plate: String,
    vin: String, // Número do chassi
    fuelType: {
      type: String,
      enum: ['gasoline', 'diesel', 'ethanol', 'flex', 'electric', 'hybrid', 'other', 'none'],
      default: 'none'
    },
    fuelCapacity: Number, // em litros
    tankCalibration: [{
      level: Number, // percentual do sensor (0-100%)
      volume: Number // volume correspondente em litros
    }],
    odometerOffset: { // offset do odômetro em km
      type: Number,
      default: 0
    },
    engineHoursOffset: { // offset das horas de motor em horas
      type: Number,
      default: 0
    }
  },
  // Informações do dispositivo de rastreamento
  device: {
    model: String,
    imei: String,
    phone: String,
    serialNumber: String,
    simCard: String,
    firmwareVersion: String
  },
  // Status atual
  status: {
    type: String,
    enum: ['online', 'offline', 'unknown', 'inactive', 'maintenance'],
    default: 'unknown'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  // Última posição conhecida
  position: {
    latitude: Number,
    longitude: Number,
    altitude: Number,
    speed: Number,
    course: Number,
    timestamp: Date
  },
  // Última comunicação com o servidor
  lastUpdate: {
    type: Date
  },
  // Configurações de rastreamento
  settings: {
    // Intervalo mínimo de tempo entre atualizações (segundos)
    updateInterval: {
      type: Number,
      default: 60
    },
    // Distância mínima entre atualizações (metros)
    minDistance: {
      type: Number,
      default: 50
    },
    // Velocidade máxima permitida em km/h (para alertas)
    speedLimit: {
      type: Number,
      default: 0 // 0 = sem limite
    },
    // Horários de operação
    workingHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    },
    // Sensores
    sensors: [{
      id: String,
      name: String,
      type: {
        type: String,
        enum: ['digitalInput', 'digitalOutput', 'analogInput', 'temperature', 'fuel', 'custom']
      },
      attribute: String, // nome do atributo no objeto de posição
      description: String,
      unit: String, // unidade de medida
      rangeMin: Number, // valor mínimo para o sensor
      rangeMax: Number, // valor máximo para o sensor
      alarmMin: Number, // valor mínimo para alarmes
      alarmMax: Number // valor máximo para alarmes
    }],
    // Notificações
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: false
        },
        addresses: [String]
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false
        },
        numbers: [String]
      },
      pushNotifications: {
        enabled: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  // Geocercas associadas a este dispositivo
  geofences: [{
    type: Schema.Types.ObjectId,
    ref: 'Geofence'
  }],
  // Grupos a que este dispositivo pertence
  groups: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }],
  // Manutenção programada
  maintenance: [{
    type: {
      type: String,
      enum: ['oil', 'tires', 'brakes', 'general', 'inspection', 'custom'],
      required: true
    },
    name: String,
    description: String,
    interval: Number, // em km ou horas
    intervalType: {
      type: String,
      enum: ['km', 'hours', 'days'],
      default: 'km'
    },
    lastServiceOdometer: Number, // km na última manutenção
    lastServiceHours: Number, // horas de motor na última manutenção
    lastServiceDate: Date, // data da última manutenção
    notifyBefore: Number, // notificar X km/horas antes
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  // Campos personalizados (para atributos específicos do cliente)
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  // Metadata e informações de auditoria
  meta: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Índices para otimização de consultas
DeviceSchema.index({ userId: 1, name: 1 });
DeviceSchema.index({ identifier: 1 }, { unique: true });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ 'position.timestamp': -1 });
DeviceSchema.index({ groups: 1 });

// Método para checar se o dispositivo está online
DeviceSchema.methods.isOnline = function() {
  if (!this.lastUpdate) return false;
  const offlineThreshold = 5 * 60 * 1000; // 5 minutos
  return (new Date() - this.lastUpdate) < offlineThreshold;
};

// Método para calcular tempo de inatividade
DeviceSchema.methods.getInactiveTime = function() {
  if (!this.lastUpdate) return null;
  return new Date() - this.lastUpdate;
};

// Método para verificar se a manutenção está pendente
DeviceSchema.methods.checkMaintenanceDue = function() {
  if (!this.maintenance || this.maintenance.length === 0) return [];
  
  const currentOdometer = this.position?.odometer || 0;
  const currentHours = this.position?.engineHours || 0;
  const now = new Date();
  
  return this.maintenance.filter(item => {
    if (!item.enabled) return false;
    
    // Verificar com base no tipo de intervalo
    if (item.intervalType === 'km') {
      const nextService = item.lastServiceOdometer + item.interval;
      return currentOdometer >= (nextService - item.notifyBefore);
    } else if (item.intervalType === 'hours') {
      const nextService = item.lastServiceHours + item.interval;
      return currentHours >= (nextService - item.notifyBefore);
    } else if (item.intervalType === 'days') {
      const nextService = new Date(item.lastServiceDate);
      nextService.setDate(nextService.getDate() + item.interval);
      
      // Calcular dias restantes
      const daysLeft = Math.ceil((nextService - now) / (1000 * 60 * 60 * 24));
      return daysLeft <= item.notifyBefore;
    }
    
    return false;
  });
};

// Método estático para encontrar dispositivos por status
DeviceSchema.statics.findByStatus = function(status, userId = null) {
  const query = { status };
  if (userId) query.userId = userId;
  return this.find(query);
};

// Exportar modelo
const Device = mongoose.model('Device', DeviceSchema);
module.exports = Device;