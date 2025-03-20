/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Dispositivo (rastreador/veículo)
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

class Device extends Model {
  // Método para checar se o dispositivo está online
  isOnline() {
    if (!this.lastUpdate) return false;
    const offlineThreshold = 5 * 60 * 1000; // 5 minutos
    return (new Date() - new Date(this.lastUpdate)) < offlineThreshold;
  }

  // Método para calcular tempo de inatividade
  getInactiveTime() {
    if (!this.lastUpdate) return null;
    return new Date() - new Date(this.lastUpdate);
  }
}

Device.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Informações básicas do dispositivo
  name: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  uniqueId: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true
  },
  // Proprietário do dispositivo
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    index: true
  },
  // Tipo de dispositivo/veículo
  category: {
    type: DataTypes.STRING(128),
    defaultValue: 'default'
  },
  // Status e posição
  status: {
    type: DataTypes.ENUM('online', 'offline', 'unknown', 'inactive'),
    defaultValue: 'unknown'
  },
  lastUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastPositionId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Última posição conhecida
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  course: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  // Informações do veículo
  model: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  contact: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  plate: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  // Configurações
  disabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  speedLimit: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  // Atributos extras em formato JSON
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Campos para manutenção
  maintenanceInterval: {
    type: DataTypes.INTEGER,
    defaultValue: 0  // em km, 0 = desativado
  },
  totalDistance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  hours: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastMaintenance: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Device',
  tableName: 'devices',
  indexes: [
    {
      fields: ['userId', 'name']
    },
    {
      fields: ['uniqueId'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['lastUpdate']
    }
  ],
  timestamps: true
});

// Associações
Device.belongsTo(User, { foreignKey: 'userId' });

// Métodos estáticos
Device.findByStatus = async function(status, userId = null) {
  const query = { status };
  if (userId) query.userId = userId;
  return this.findAll({ where: query });
};

// Verificar manutenção pendente
Device.prototype.checkMaintenanceDue = function() {
  if (!this.maintenanceInterval || this.maintenanceInterval <= 0) return false;
  if (!this.lastMaintenance) return true;
  
  // Verificar se a distância percorrida desde a última manutenção excede o intervalo
  const lastMaintenanceDate = new Date(this.lastMaintenance);
  const distanceSinceLastMaintenance = this.totalDistance - (this.attributes.maintenanceOdometer || 0);
  
  return distanceSinceLastMaintenance >= this.maintenanceInterval;
};

module.exports = Device;