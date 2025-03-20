const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Device extends Model {
  /**
   * Verifica o status atual do dispositivo com base na última atualização
   * @returns {string} - Status do dispositivo ('online', 'offline' ou 'unknown')
   */
  getStatus() {
    if (!this.lastUpdate) return 'unknown';

    const now = new Date();
    const lastUpdate = new Date(this.lastUpdate);
    const diffMinutes = (now - lastUpdate) / (1000 * 60);

    // Se a última atualização foi há menos de 5 minutos, consideramos online
    if (diffMinutes <= 5) return 'online';
    
    // Se a última atualização foi há mais de 6 horas, consideramos unknown
    if (diffMinutes > 360) return 'unknown';
    
    // Caso contrário, offline
    return 'offline';
  }

  /**
   * Calcula o tempo (em horas) desde a última manutenção
   * @returns {number} - Horas desde a última manutenção
   */
  getHoursSinceLastMaintenance() {
    if (!this.lastMaintenance) return null;

    const now = new Date();
    const lastMaintenance = new Date(this.lastMaintenance);
    return (now - lastMaintenance) / (1000 * 60 * 60);
  }

  /**
   * Verifica se o dispositivo precisa de manutenção
   * @param {number} maintenanceInterval - Intervalo de manutenção em horas
   * @returns {boolean} - Verdadeiro se precisa de manutenção
   */
  needsMaintenance(maintenanceInterval = 5000) {
    const hoursSinceLastMaintenance = this.getHoursSinceLastMaintenance();
    if (hoursSinceLastMaintenance === null) return true;
    return hoursSinceLastMaintenance >= maintenanceInterval;
  }

  /**
   * Verifica se o modelo do dispositivo é suportado
   * @param {Array<string>} supportedModels - Lista de modelos suportados
   * @returns {boolean} - Verdadeiro se o modelo é suportado
   */
  isModelSupported(supportedModels = []) {
    return supportedModels.includes(this.model);
  }
}

Device.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uniqueId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  model: {
    type: DataTypes.STRING,
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
  status: {
    type: DataTypes.ENUM('online', 'offline', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown'
  },
  lastUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'positions',
      key: 'id'
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  lastMaintenance: {
    type: DataTypes.DATE,
    allowNull: true
  },
  traccarId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Device',
  tableName: 'devices',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['uniqueId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Device;