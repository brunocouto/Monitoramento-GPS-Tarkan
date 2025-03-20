/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Geocerca
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GeofenceSchema = new Schema({
  // Informações básicas
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Proprietário da geocerca
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Tipo de geocerca
  type: {
    type: String,
    enum: ['circle', 'polygon', 'rectangle', 'route'],
    required: true
  },
  // Área da geocerca (dependendo do tipo)
  area: {
    // Para tipo "circle"
    circle: {
      center: {
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
      radius: {
        type: Number, // em metros
        min: 10
      }
    },
    // Para tipo "polygon" e "rectangle"
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon'
      },
      coordinates: {
        type: [[[Number]]], // Array de anéis, cada anel é um array de coordenadas [longitude, latitude]
        index: '2dsphere'
      }
    },
    // Para tipo "route"
    route: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString'
      },
      coordinates: {
        type: [[Number]], // Array de coordenadas [longitude, latitude]
        index: '2dsphere'
      },
      width: {
        type: Number, // largura do corredor em metros
        min: 10,
        default: 100
      }
    }
  },
  // Cor para exibição no mapa
  color: {
    type: String,
    default: '#FF0000' // Vermelho padrão
  },
  // Dispositivos associados a esta geocerca
  devices: [{
    type: Schema.Types.ObjectId,
    ref: 'Device'
  }],
  // Grupos associados a esta geocerca
  groups: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }],
  // Programação de ativação
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    // Dias da semana: 0 = Domingo, 1 = Segunda, etc.
    days: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6]
    },
    // Períodos de tempo para cada dia
    times: [{
      start: String, // formato HH:MM
      end: String    // formato HH:MM
    }]
  },
  // Configurações para alertas
  alerts: {
    onEnter: {
      enabled: {
        type: Boolean,
        default: true
      },
      notifyUser: {
        type: Boolean,
        default: true
      },
      notifyEmail: {
        type: Boolean,
        default: false
      },
      emails: [String],
      message: String,
      webhookUrl: String
    },
    onExit: {
      enabled: {
        type: Boolean,
        default: true
      },
      notifyUser: {
        type: Boolean,
        default: true
      },
      notifyEmail: {
        type: Boolean,
        default: false
      },
      emails: [String],
      message: String,
      webhookUrl: String
    },
    onDwell: {
      enabled: {
        type: Boolean,
        default: false
      },
      timeThreshold: {
        type: Number, // tempo em minutos
        default: 10
      },
      notifyUser: {
        type: Boolean,
        default: true
      },
      notifyEmail: {
        type: Boolean,
        default: false
      },
      emails: [String],
      message: String,
      webhookUrl: String
    },
    speedLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxSpeed: {
        type: Number, // km/h
        default: 80
      },
      notifyUser: {
        type: Boolean,
        default: true
      },
      notifyEmail: {
        type: Boolean,
        default: false
      },
      emails: [String],
      message: String,
      webhookUrl: String
    }
  },
  // Campos adicionais
  attributes: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  // Estatísticas de uso
  stats: {
    createdEvents: {
      type: Number,
      default: 0
    },
    lastEvent: Date
  },
  // Se a geocerca está ativa ou não
  active: {
    type: Boolean,
    default: true
  },
  // Metadados
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

// Índices para melhorar performance
GeofenceSchema.index({ 'area.circle.center': '2dsphere' });
GeofenceSchema.index({ 'area.polygon': '2dsphere' });
GeofenceSchema.index({ 'area.route': '2dsphere' });
GeofenceSchema.index({ userId: 1, active: 1 });
GeofenceSchema.index({ devices: 1 });

// Método para verificar se uma posição está dentro da geocerca
GeofenceSchema.methods.containsPosition = function(position) {
  const { latitude, longitude } = position;
  
  if (!latitude || !longitude) {
    return false;
  }
  
  // Ponto a ser verificado
  const point = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  
  // Verificar com base no tipo de geocerca
  if (this.type === 'circle' && this.area.circle) {
    // Calcular distância entre o ponto e o centro do círculo
    const center = this.area.circle.center.coordinates;
    const radius = this.area.circle.radius;
    
    // Fórmula de Haversine para calcular distância entre dois pontos na Terra
    const R = 6371000; // Raio da Terra em metros
    const lat1 = latitude * Math.PI / 180;
    const lat2 = center[1] * Math.PI / 180;
    const deltaLat = (center[1] - latitude) * Math.PI / 180;
    const deltaLon = (center[0] - longitude) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= radius;
  } 
  else if (this.type === 'polygon' || this.type === 'rectangle') {
    // Verificar se o ponto está dentro do polígono
    return isPointInPolygon(point, this.area.polygon);
  }
  else if (this.type === 'route') {
    // Verificar se o ponto está dentro do corredor da rota
    return isPointNearLineString(point, this.area.route, this.area.route.width);
  }
  
  return false;
};

// Método para verificar se a geocerca está ativa no momento atual
GeofenceSchema.methods.isActiveNow = function() {
  if (!this.active) return false;
  
  // Se não tem programação, está sempre ativa
  if (!this.schedule || !this.schedule.enabled) return true;
  
  // Data e hora atual baseada no timezone da geocerca
  const now = new Date();
  const timezone = this.schedule.timezone || 'America/Sao_Paulo';
  const options = { timeZone: timezone };
  
  // Dia da semana atual (0-6, sendo 0 = domingo)
  const dayOfWeek = now.getDay();
  
  // Verificar se o dia atual está configurado
  if (!this.schedule.days.includes(dayOfWeek)) return false;
  
  // Hora e minuto atuais
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  // Verificar se a hora atual está dentro de algum período configurado
  return this.schedule.times.some(period => {
    const [startHour, startMinute] = period.start.split(':').map(Number);
    const [endHour, endMinute] = period.end.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  });
};

// Método para incrementar contador de eventos
GeofenceSchema.methods.incrementEventCount = async function() {
  this.stats.createdEvents += 1;
  this.stats.lastEvent = new Date();
  await this.save();
};

// Funções auxiliares para cálculos geoespaciais
function isPointInPolygon(point, polygon) {
  // Implementação do algoritmo de ray casting (ponto-em-polígono)
  // Esta é uma implementação simplificada
  
  const x = point.coordinates[0];
  const y = point.coordinates[1];
  const vertices = polygon.coordinates[0]; // O primeiro anel do polígono
  
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    
    const intersect = ((yi > y) != (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

function isPointNearLineString(point, lineString, maxDistance) {
  // Verificar se um ponto está a uma distância máxima de uma linha
  const pointCoords = point.coordinates;
  const lineCoords = lineString.coordinates;
  
  // Encontrar o segmento de linha mais próximo
  let minDistance = Infinity;
  
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const segment = [lineCoords[i], lineCoords[i + 1]];
    const distance = distanceToSegment(pointCoords, segment);
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance <= maxDistance;
}

function distanceToSegment(point, segment) {
  // Calcular a distância de um ponto a um segmento de linha
  const [x, y] = point;
  const [[x1, y1], [x2, y2]] = segment;
  
  // Calcular o quadrado da distância de linha usando projeção
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  
  if (len_sq != 0) {
    param = dot / len_sq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = x - xx;
  const dy = y - yy;
  
  // Convertendo para distância em metros (simplificado)
  const R = 6371000; // Raio da Terra em metros
  const lat1 = y * Math.PI / 180;
  const lat2 = yy * Math.PI / 180;
  const deltaLat = (yy - y) * Math.PI / 180;
  const deltaLon = (xx - x) * Math.PI / 180;
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Exportar o modelo
const Geofence = mongoose.model('Geofence', GeofenceSchema);
module.exports = Geofence;