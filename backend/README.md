# Backend do Sistema de Monitoramento GPS Tarkan

Esta parte do projeto contém o servidor backend para o Sistema de Monitoramento GPS Tarkan, que oferece uma API RESTful e um servidor de protocolo para receber dados de dispositivos GPS.

## Estrutura do Backend

```
backend/
├── config/             # Configurações do sistema
├── controllers/        # Controladores da API
├── middleware/         # Middlewares Express
├── models/             # Modelos de dados
├── routes/             # Rotas da API
├── services/           # Serviços de negócios
│   ├── protocols/      # Parsers para protocolos GPS
├── utils/              # Utilitários
├── server.js           # Ponto de entrada do servidor
├── package.json        # Dependências
└── Dockerfile          # Configuração para Docker
```

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução
- **Express**: Framework para API RESTful
- **Sequelize**: ORM para banco de dados
- **MySQL**: Banco de dados relacional
- **JWT**: Autenticação e autorização
- **Socket.io**: Comunicação em tempo real
- **Winston**: Sistema de logs
- **Docker**: Contêinerização

## Funcionalidades Principais

1. **API RESTful**: Endpoints para gerenciar usuários, dispositivos, posições e geofences
2. **Servidor de Protocolo**: Receptor para múltiplos protocolos de dispositivos GPS
3. **Autenticação**: Sistema seguro baseado em JWT
4. **Geofencing**: Detecção de entrada/saída em áreas definidas
5. **Alertas**: Sistema configurável de alertas e notificações
6. **Relatórios**: Geração de relatórios personalizados

## Protocolo do Servidor

O servidor de protocolo suporta vários formatos de dispositivos GPS, incluindo:

- TK103
- GT06
- H02
- Coban
- Teltonika

## API REST

A API segue princípios RESTful e os principais endpoints incluem:

- `/api/v1/auth`: Autenticação e gestão de usuários
- `/api/v1/devices`: Gerenciamento de dispositivos
- `/api/v1/positions`: Acesso a dados de posição
- `/api/v1/geofences`: Gerenciamento de cercas virtuais
- `/api/v1/reports`: Geração de relatórios
- `/api/v1/alerts`: Configuração de alertas

## Instalação

### Requisitos

- Node.js 16+
- MySQL 8+
- Docker e Docker Compose (opcional)

### Instalação com Docker

1. Clone o repositório
2. Configure as variáveis de ambiente em um arquivo `.env`
3. Execute `docker-compose up`

### Instalação Local

1. Clone o repositório
2. Configure as variáveis de ambiente em um arquivo `.env`
3. Execute `npm install`
4. Execute `npm run migrate`
5. Inicie o servidor com `npm start`

## Variáveis de Ambiente

Veja abaixo as principais variáveis de ambiente utilizadas:

```
# Geral
NODE_ENV=development
PORT=3000
PROTOCOL_PORT=5023

# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=traccar_db
DB_USER=root
DB_PASSWORD=root
DB_SYNC=false

# JWT
JWT_SECRET=seu-segredo-seguro
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

## Desenvolvimento

### Scripts Disponíveis

- `npm start`: Inicia o servidor
- `npm run dev`: Inicia o servidor com hot-reload
- `npm run migrate`: Executa migrações do banco de dados
- `npm test`: Executa testes
- `npm run lint`: Verifica código com ESLint

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.