const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class User extends Model {
  /**
   * Compara a senha fornecida com a senha hash armazenada
   * @param {string} password - Senha a ser verificada
   * @returns {Promise<boolean>} - Verdadeiro se a senha corresponder
   */
  async comparePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  /**
   * Gera um token JWT para o usuário
   * @returns {string} - Token JWT
   */
  generateAuthToken() {
    const token = jwt.sign(
      { id: this.id, email: this.email, role: this.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    return token;
  }

  /**
   * Verifica se o usuário tem permissão para acessar um dispositivo
   * @param {number} deviceId - ID do dispositivo
   * @returns {Promise<boolean>} - Verdadeiro se tiver permissão
   */
  async hasDeviceAccess(deviceId) {
    // Se for administrador, tem acesso a todos os dispositivos
    if (this.role === 'admin') return true;

    // Verificar se o dispositivo pertence ao usuário
    const device = await sequelize.models.Device.findOne({
      where: { id: deviceId, userId: this.id }
    });

    return !!device;
  }

  /**
   * Verifica se o usuário tem permissão para acessar um recurso
   * @param {string} resource - Recurso a ser acessado
   * @param {string} action - Ação a ser executada (read, write, delete)
   * @returns {boolean} - Verdadeiro se tiver permissão
   */
  hasPermission(resource, action) {
    // Administradores têm todas as permissões
    if (this.role === 'admin') return true;

    // Implementar lógica de permissões baseada em papéis e recursos
    const permissions = {
      user: {
        'devices': ['read', 'write'],
        'positions': ['read'],
        'geofences': ['read', 'write'],
        'reports': ['read'],
        'alerts': ['read', 'write']
      },
      manager: {
        'devices': ['read', 'write', 'delete'],
        'positions': ['read'],
        'geofences': ['read', 'write', 'delete'],
        'reports': ['read', 'write'],
        'alerts': ['read', 'write', 'delete'],
        'users': ['read']
      }
    };

    if (!permissions[this.role]) return false;
    if (!permissions[this.role][resource]) return false;
    return permissions[this.role][resource].includes(action);
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'user'),
    allowNull: false,
    defaultValue: 'user'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tokenExpiration: {
    type: DataTypes.DATE,
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
  notificationTokens: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('notificationTokens');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('notificationTokens', JSON.stringify(value || []));
    }
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

module.exports = User;