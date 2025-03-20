/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Usuário
 */

const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');

class User extends Model {
  // Método para comparar senha
  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Método para gerar token JWT
  generateAuthToken() {
    const token = jwt.sign(
      { 
        id: this.id,
        email: this.email,
        role: this.role
      }, 
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    return token;
  }

  // Método para verificar se usuário tem uma determinada permissão
  hasPermission(permission) {
    // Admins têm todas as permissões
    if (this.role === 'admin') return true;
    
    // Gerentes têm a maioria das permissões
    if (this.role === 'manager' && permission !== 'admin') return true;
    
    // Verificar permissões específicas
    const userPermissions = this.attributes.permissions || {};
    return userPermissions[permission] === true;
  }
}

User.init({
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
  email: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'user', 'driver', 'readonly'),
    defaultValue: 'user'
  },
  // Status da conta
  disabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Registro de atividade
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginFailures: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Token para recuperação de senha
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Preferências e configurações
  timezone: {
    type: DataTypes.STRING(128),
    defaultValue: 'America/Sao_Paulo'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'pt-BR'
  },
  // Atributos extras em formato JSON (incluindo permissões)
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      fields: ['email'],
      unique: true
    },
    {
      fields: ['role']
    }
  ],
  hooks: {
    // Hash de senha antes de salvar
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Métodos estáticos
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

// Excluir dados sensíveis ao converter para JSON
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Remover campos sensíveis
  delete values.password;
  delete values.resetToken;
  delete values.resetTokenExpires;
  
  return values;
};

module.exports = User;