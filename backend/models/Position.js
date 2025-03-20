const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Position extends Model {
  /**
   * Calcula a distância em metros entre esta posição e outra posição fornecida
   * @param {Position} position - Outra posição para calcular a distância
   * @returns {number} - Distância em metros
   */
  getDistanceTo(position) {
    const R = 6371000; // Raio da Terra em metros
    const lat1 = this.latitude * Math.PI / 180;
    const lat2 = position.latitude * Math.PI / 180;
    const deltaLat = (position.latitude - this.latitude) * Math.PI / 180;
    const deltaLon = (position.longitude - this.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Encontra posições dentro de um raio em metros a partir desta posição
   * @param {Array<Position>} positions - Lista de posições para verificar
   * @param {number} radius - Raio em metros
   * @returns {Array<Position>} - Posições dentro do raio
   */
  getPositionsWithinRadius(positions, radius) {
    return positions.filter(position => this.getDistanceTo(position) <= radius);
  }

  /**
   * Obtém a velocidade em km/h
   * @returns {number} - Velocidade em km/h
   */
  getSpeedKmh() {
    return this.speed * 3.6; // Converter m/s para km/h
  }

  /**
   * Verifica se esta posição está dentro de uma geocerca
   * @param {Geofence} geofence - Geocerca para verificar
   * @returns {boolean} - Verdadeiro se está dentro da geocerca
   */
  isWithinGeofence(geofence) {
    // Implementação depende do tipo de geocerca (círculo, polígono, etc.)
    if (geofence.type === 'circle') {
      const center = {
        latitude: geofence.latitude,
        longitude: geofence.longitude
      };
      const distance = this.getDistanceTo(center);
      return distance <= geofence.radius;
    }
    // Adicionar outros tipos conforme necessário
    return false;
  }
}

Position.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  protocol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  altitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  speed: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  course: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
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
  accuracy: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'Position',
  tableName: 'positions',
  timestamps: true,
  indexes: [
    {
      fields: ['deviceId']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['deviceId', 'timestamp']
    }
  ]
});

module.exports = Position;