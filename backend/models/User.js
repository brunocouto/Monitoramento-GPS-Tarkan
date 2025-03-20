/**
 * Sistema de Monitoramento GPS Tarkan
 * Modelo de Usuário
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  // Informações básicas
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // não enviar por padrão nas consultas
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user', 'viewer', 'driver'],
    default: 'user'
  },
  // Status da conta
  active: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Informações de contato
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  // Configurações de notificação
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: {
        alerts: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        system: { type: Boolean, default: true }
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      token: String,
      platform: {
        type: String,
        enum: ['android', 'ios', 'web', ''],
        default: ''
      },
      types: {
        alerts: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        system: { type: Boolean, default: true }
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      types: {
        alerts: { type: Boolean, default: true },
        system: { type: Boolean, default: true }
      }
    }
  },
  // Preferências da interface
  preferences: {
    language: {
      type: String,
      default: 'pt-BR'
    },
    distanceUnit: {
      type: String,
      enum: ['km', 'mi'],
      default: 'km'
    },
    speedUnit: {
      type: String,
      enum: ['kph', 'mph', 'kn'],
      default: 'kph'
    },
    volumeUnit: {
      type: String,
      enum: ['liter', 'gallon'],
      default: 'liter'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    mapType: {
      type: String,
      enum: ['roadmap', 'satellite', 'hybrid', 'terrain'],
      default: 'roadmap'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '24h'
    },
    startOfWeek: {
      type: Number,
      enum: [0, 1], // 0 = domingo, 1 = segunda
      default: 1
    },
    theme: {
      type: String, 
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  // Permissões de acesso
  permissions: {
    devices: {
      view: {
        type: Boolean,
        default: true
      },
      edit: {
        type: Boolean,
        default: false
      },
      remove: {
        type: Boolean,
        default: false
      }
    },
    users: {
      view: {
        type: Boolean,
        default: false
      },
      edit: {
        type: Boolean,
        default: false
      },
      remove: {
        type: Boolean,
        default: false
      }
    },
    reports: {
      view: {
        type: Boolean,
        default: true
      },
      export: {
        type: Boolean,
        default: false
      }
    },
    alerts: {
      view: {
        type: Boolean,
        default: true
      },
      manage: {
        type: Boolean,
        default: false
      }
    },
    geofences: {
      view: {
        type: Boolean,
        default: true
      },
      edit: {
        type: Boolean,
        default: false
      },
      remove: {
        type: Boolean,
        default: false
      }
    },
    customPermissions: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  // Para recuperação de senha
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Para controle de acesso
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  // Registro de últimos acessos
  lastLogin: {
    date: Date,
    ip: String,
    userAgent: String
  },
  // Referências à organização (se aplicável)
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  // Campos personalizados
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  // Metadados da conta
  meta: {
    // Usuário que criou esta conta (para contas criadas por admins)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    // Usuário que atualizou mais recentemente
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    // Código de verificação para e-mail
    verificationCode: String,
    // Data de expiração do código de verificação
    verificationExpires: Date
  }
}, {
  timestamps: true
});

// Middleware para hash de senha antes de salvar
UserSchema.pre('save', async function(next) {
  const user = this;
  
  if (user.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  
  next();
});

// Método para comparar senha
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Método para gerar token JWT
UserSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role
    }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  
  // Adicionar token à lista de tokens
  user.tokens = user.tokens || [];
  user.tokens.push({ token });
  await user.save();
  
  return token;
};

// Método para revogar token
UserSchema.methods.revokeToken = async function(token) {
  this.tokens = this.tokens.filter(t => t.token !== token);
  await this.save();
};

// Método para revogar todos os tokens (logout de todos os dispositivos)
UserSchema.methods.revokeAllTokens = async function() {
  this.tokens = [];
  await this.save();
};

// Método para gerar token de redefinição de senha
UserSchema.methods.generatePasswordResetToken = async function() {
  // Gerar token aleatório
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token e definir ao campo resetPasswordToken
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Definir expiração (10 minutos)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  await this.save();
  
  return resetToken;
};

// Método estático para buscar usuário pelo e-mail
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Método para verificar se usuário tem uma determinada permissão
UserSchema.methods.hasPermission = function(permission) {
  // Admins têm todas as permissões
  if (this.role === 'admin') return true;
  
  // Verificar permissão específica
  // Exemplo: 'devices.view', 'reports.export'
  const [resource, action] = permission.split('.');
  
  if (!this.permissions || !this.permissions[resource]) {
    return false;
  }
  
  return this.permissions[resource][action] === true;
};

// Esconder campos sensíveis ao converter para JSON
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Remover campos sensíveis
  delete user.password;
  delete user.tokens;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.__v;
  
  return user;
};

// Modelo
const User = mongoose.model('User', UserSchema);
module.exports = User;