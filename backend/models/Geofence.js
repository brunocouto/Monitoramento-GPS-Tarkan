const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Geofence extends Model {
  /**
   * Verifica se uma posição está dentro desta geocerca
   * @param {Position} position - Posição para verificar
   * @returns {boolean} - Verdadeiro se a posição está dentro da geocerca
   */
  containsPosition(position) {
    if (this.type === 'circle') {
      // Para geocerca circular
      const center = {
        latitude: this.latitude,
        longitude: this.longitude
      };
      
      const R = 6371000; // Raio da Terra em metros
      const lat1 = center.latitude * Math.PI / 180;
      const lat2 = position.latitude * Math.PI / 180;
      const deltaLat = (position.latitude - center.latitude) * Math.PI / 180;
      const deltaLon = (position.longitude - center.longitude) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return distance <= this.radius;
    } else if (this.type === 'polygon') {
      // Para geocerca poligonal (usando o algoritmo de ponto em polígono)
      const polygon = this.getPolygonPoints();
      return this.pointInPolygon(position, polygon);
    }
    
    return false;
  }

  /**
   * Obtém os pontos do polígono a partir da string de área
   * @returns {Array} - Array de pontos [latitude, longitude]
   */
  getPolygonPoints() {
    if (!this.area || this.type !== 'polygon') return [];
    try {
      return JSON.parse(this.area);
    } catch (e) {
      return [];
    }
  }

  /**
   * Verifica se um ponto está dentro de um polígono usando o algoritmo ray casting
   * @param {Object} point - Ponto a verificar {latitude, longitude}
   * @param {Array} polygon - Array de pontos do polígono [[lat1, lon1], [lat2, lon2], ...]
   * @returns {boolean} - Verdadeiro se o ponto está dentro do polígono
   */
  pointInPolygon(point, polygon) {
    if (!polygon.length) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1], yi = polygon[i][0];
      const xj = polygon[j][1], yj = polygon[j][0];
      
      const intersect = ((yi > point.latitude) !== (yj > point.latitude))
          && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Verifica se a geocerca está ativa no momento atual
   * @returns {boolean} - Verdadeiro se a geocerca está ativa
   */
  isActive() {
    if (!this.startTime && !this.endTime) return true;
    
    const now = new Date();
    const time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    let start = 0;
    let end = 86400; // 24 horas em segundos
    
    if (this.startTime) {
      const parts = this.startTime.split(':');
      start = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60;
    }
    
    if (this.endTime) {
      const parts = this.endTime.split(':');
      end = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60;
    }
    
    if (start <= end) {
      return time >= start && time <= end;
    } else {
      // Para intervalos que cruzam a meia-noite
      return time >= start || time <= end;
    }
  }
}

Geofence.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('polygon', 'circle', 'linestring'),
    allowNull: false,
    defaultValue: 'circle'
  },
  area: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array de pontos para polígono ou linestring'
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    comment: 'Centro do círculo'
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    comment: 'Centro do círculo'
  },
  radius: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    comment: 'Raio do círculo em metros'
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#FF0000'
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hora de início no formato HH:MM'
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hora de fim no formato HH:MM'
  },
  attributes: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('attributes');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('attributes', JSON.stringify(value || {}));
    }
  },
  calendarId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'calendars',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'Geofence',
  tableName: 'geofences',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['calendarId']
    }
  ]
});

module.exports = Geofence;