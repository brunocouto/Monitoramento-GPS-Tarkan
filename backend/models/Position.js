/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de dados de Posição
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema geoespacial otimizado para consultas de localização
const PositionSchema = new Schema({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  protocol: {
    type: String,
    default: 'unknown'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Coordenadas geográficas
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  altitude: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number,
    default: 0,
    index: true
  },
  course: {
    type: Number,
    default: 0
  },
  // Localização em formato GeoJSON para consultas espaciais
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  // Atributos adicionais do dispositivo (pode incluir nível de combustível, temperatura, etc.)
  attributes: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  // Flag para indicar se esta posição foi calculada ou é uma leitura real
  calculated: {
    type: Boolean,
    default: false
  },
  // Distância percorrida desde a última posição (em metros)
  distance: {
    type: Number,
    default: 0
  },
  // Identificação de viagem e parada
  tripId: {
    type: Schema.Types.ObjectId,
    ref: 'Trip',
    index: true
  },
  isStop: {
    type: Boolean,
    default: false,
    index: true
  },
  // Geocercas ativas no momento desta posição
  activeGeofences: [{
    type: Schema.Types.ObjectId,
    ref: 'Geofence'
  }],
  // Eventos associados a esta posição
  events: [{
    type: {
      type: String,
      enum: ['geofenceEnter', 'geofenceExit', 'speedLimit', 'engineOn', 'engineOff', 'alarm', 'sos', 'other']
    },
    geofenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    description: String,
    data: Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Middleware pré-save para garantir consistência de dados
PositionSchema.pre('save', function(next) {
  // Garantir que a localização GeoJSON seja atualizada com as coordenadas
  this.location = {
    type: 'Point',
    coordinates: [this.longitude, this.latitude] // GeoJSON usa [longitude, latitude]
  };

  next();
});

// Middleware pré-update para garantir consistência de dados
PositionSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Se latitude ou longitude forem atualizados, atualizar location também
  if (update.latitude !== undefined || update.longitude !== undefined) {
    const latitude = update.latitude !== undefined ? update.latitude : this._update.$set.latitude;
    const longitude = update.longitude !== undefined ? update.longitude : this._update.$set.longitude;
    
    if (!update.$set) update.$set = {};
    update.$set.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }

  next();
});

// Índices para otimização de consultas comuns
PositionSchema.index({ deviceId: 1, timestamp: -1 }); // Busca de posições de um dispositivo por ordem de tempo
PositionSchema.index({ timestamp: -1 }); // Busca global por tempo
PositionSchema.index({ 'events.type': 1 }); // Busca por tipos de eventos

// Métodos estáticos para operações comuns
PositionSchema.statics.getLatestPositions = async function(deviceIds) {
  return this.aggregate([
    {
      $match: { deviceId: { $in: deviceIds } }
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
    }
  ]);
};

// Método para calcular distância entre posições
PositionSchema.statics.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distância em km
};

// Método para buscar posições dentro de um raio
PositionSchema.statics.findWithinRadius = async function(lat, lon, radiusKm, options = {}) {
  const { startTime, endTime, limit = 100 } = options;
  
  const query = {
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        $maxDistance: radiusKm * 1000 // Converter para metros
      }
    }
  };

  if (startTime || endTime) {
    query.timestamp = {};
    if (startTime) query.timestamp.$gte = new Date(startTime);
    if (endTime) query.timestamp.$lte = new Date(endTime);
  }

  return this.find(query).limit(limit);
};

// Criar índices TTL opcionais para limpeza automática de dados antigos
// Descomentar apenas se desejar limpeza automática
// PositionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 dias

// Exportar modelo
const Position = mongoose.model('Position', PositionSchema);
module.exports = Position;