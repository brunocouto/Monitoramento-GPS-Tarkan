/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de dados de Posição
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Device = require('./Device');

class Position extends Model {}

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
    },
    index: true
  },
  protocol: {
    type: DataTypes.STRING(128),
    defaultValue: 'unknown'
  },
  serverTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deviceTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fixTime: {
    type: DataTypes.DATE,
    allowNull: false,
    index: true
  },
  // Coordenadas geográficas
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  altitude: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  speed: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    index: true
  },
  course: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Dados adicionais
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  // Atributos adicionais em formato JSON
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Flag para indicar se esta posição foi calculada ou é uma leitura real
  valid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Distância percorrida desde a última posição (em metros)
  distance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  // Identificação de viagem e parada
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    index: true
  },
  isStop: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    index: true
  }
}, {
  sequelize,
  modelName: 'Position',
  tableName: 'positions',
  indexes: [
    {
      fields: ['deviceId', 'fixTime']
    },
    {
      fields: ['fixTime']
    },
    {
      fields: ['deviceId', 'isStop']
    }
  ],
  timestamps: true
});

// Associações
Position.belongsTo(Device, { foreignKey: 'deviceId' });

// Hooks
Position.addHook('afterCreate', async (position, options) => {
  try {
    // Atualizar informações do dispositivo quando uma nova posição é registrada
    await Device.update({
      lastUpdate: new Date(),
      lastPositionId: position.id,
      status: 'online',
      latitude: position.latitude,
      longitude: position.longitude,
      course: position.course,
      speed: position.speed
    }, {
      where: { id: position.deviceId },
      transaction: options.transaction
    });
  } catch (error) {
    console.error('Erro ao atualizar dispositivo após nova posição:', error);
  }
});

// Métodos estáticos para operações comuns
Position.getLatestPositions = async function(deviceIds) {
  const positions = await this.findAll({
    where: {
      deviceId: deviceIds
    },
    order: [
      ['deviceId', 'ASC'],
      ['fixTime', 'DESC']
    ],
    include: [{
      model: Device,
      attributes: ['name', 'category', 'status']
    }]
  });

  // Filtrar para obter apenas a posição mais recente de cada dispositivo
  const latestPositions = [];
  const seen = new Set();
  
  for (const position of positions) {
    if (!seen.has(position.deviceId)) {
      seen.add(position.deviceId);
      latestPositions.push(position);
    }
  }
  
  return latestPositions;
};

// Método para calcular distância entre posições
Position.calculateDistance = function(lat1, lon1, lat2, lon2) {
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
Position.findWithinRadius = async function(lat, lon, radiusKm, options = {}) {
  const { startTime, endTime, limit = 100 } = options;
  
  // Não é possível usar operadores espaciais diretamente com Sequelize, então fazemos uma consulta SQL personalizada
  const [positions] = await sequelize.query(`
    SELECT * FROM positions
    WHERE ST_Distance_Sphere(
      point(longitude, latitude),
      point(${lon}, ${lat})
    ) <= ${radiusKm * 1000}
    ${startTime ? `AND fixTime >= '${new Date(startTime).toISOString()}'` : ''}
    ${endTime ? `AND fixTime <= '${new Date(endTime).toISOString()}'` : ''}
    ORDER BY fixTime DESC
    LIMIT ${limit}
  `);
  
  return positions;
};

module.exports = Position;