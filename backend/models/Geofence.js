/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Geocerca
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const geolib = require('geolib');

class Geofence extends Model {
  // Método para verificar se uma posição está dentro da geocerca
  containsPosition(position) {
    const { latitude, longitude } = position;
    
    if (!latitude || !longitude) {
      return false;
    }
    
    // Verificar com base no tipo de geocerca
    if (this.type === 'circle') {
      const areaData = JSON.parse(this.area);
      // Verificar se o ponto está dentro do círculo
      return geolib.isPointWithinRadius(
        { latitude, longitude },
        { latitude: areaData.centerLatitude, longitude: areaData.centerLongitude },
        areaData.radius
      );
    } 
    else if (this.type === 'polygon') {
      const areaData = JSON.parse(this.area);
      // Verificar se o ponto está dentro do polígono
      return geolib.isPointInPolygon(
        { latitude, longitude },
        areaData.points.map(p => ({ latitude: p[0], longitude: p[1] }))
      );
    }
    else if (this.type === 'rectangle') {
      const areaData = JSON.parse(this.area);
      // Verificar se o ponto está dentro do retângulo
      return geolib.isPointInside(
        { latitude, longitude },
        [
          { latitude: areaData.minLatitude, longitude: areaData.minLongitude },
          { latitude: areaData.minLatitude, longitude: areaData.maxLongitude },
          { latitude: areaData.maxLatitude, longitude: areaData.maxLongitude },
          { latitude: areaData.maxLatitude, longitude: areaData.minLongitude }
        ]
      );
    }
    
    return false;
  }
  
  // Método para verificar se a geocerca está ativa no momento atual
  isActiveNow() {
    if (!this.active) return false;
    
    // Se não tem programação, está sempre ativa
    if (!this.attributes.schedule || !this.attributes.schedule.enabled) return true;
    
    const schedule = this.attributes.schedule;
    
    // Data e hora atual
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    
    // Verificar se o dia atual está configurado
    if (!schedule.days.includes(dayOfWeek)) return false;
    
    // Hora e minuto atuais
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Verificar se a hora atual está dentro de algum período configurado
    return schedule.times.some(period => {
      const [startHour, startMinute] = period.start.split(':').map(Number);
      const [endHour, endMinute] = period.end.split(':').map(Number);
      
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
    });
  }
}

Geofence.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Informações básicas
  name: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  // Proprietário da geocerca
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    index: true
  },
  // Tipo de geocerca
  type: {
    type: DataTypes.ENUM('circle', 'polygon', 'rectangle'),
    allowNull: false
  },
  // Área da geocerca (formato JSON)
  area: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const value = this.getDataValue('area');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('area', JSON.stringify(value));
    }
  },
  // Cor para exibição no mapa
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#FF0000' // Vermelho padrão
  },
  // Se a geocerca está ativa ou não
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Atributos adicionais (incluindo programação) em formato JSON
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Contador de eventos
  calendarId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Geofence',
  tableName: 'geofences',
  indexes: [
    {
      fields: ['userId', 'active']
    },
    {
      fields: ['name']
    }
  ],
  timestamps: true
});

// Associações
Geofence.belongsTo(User, { foreignKey: 'userId' });

// Associação muitos-para-muitos com dispositivos (a ser definida após a criação do modelo GeofenceDevice)
// Geofence.belongsToMany(Device, { through: 'GeofenceDevice', foreignKey: 'geofenceId' });

module.exports = Geofence;