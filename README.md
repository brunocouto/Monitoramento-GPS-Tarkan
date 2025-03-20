# Sistema de Monitoramento GPS Tarkan

Este repositório contém o código-fonte para o Sistema de Monitoramento GPS Tarkan, uma plataforma completa de rastreamento em tempo real e gestão de frotas.

## Funcionalidades

- **Rastreamento em Tempo Real**: Visualize a localização, velocidade e status de todos os dispositivos em tempo real.
- **Histórico de Deslocamentos**: Acesse o histórico completo de posições com replay e análise de rotas.
- **Geocercas**: Configure áreas geográficas para monitoramento e alertas automáticos.
- **Alertas e Notificações**: Receba alertas sobre eventos importantes como entrada/saída de geocercas, excesso de velocidade, etc.
- **Gestão de Dispositivos**: Cadastre e gerencie veículos, motoristas e dispositivos de rastreamento.
- **Relatórios Avançados**: Gere relatórios detalhados sobre deslocamentos, paradas, tempo de operação, e mais.
- **Painel Administrativo**: Interface administrativa para configuração do sistema e gestão de usuários.

## Arquitetura

O sistema é composto por:

- **Frontend**: Interface web responsiva construída com Vue.js e otimizada para desempenho.
- **Backend**: API RESTful construída com Node.js e Express.
- **Banco de Dados**: MongoDB para armazenamento de dados.
- **Cache**: Redis para cache e armazenamento de dados em tempo real.
- **Servidor de Protocolos**: Para receber dados de diversos modelos de rastreadores.

## Estrutura do Repositório

```
/
├── backend/               # Servidor de API
│   ├── api/               # Definições de rotas e middleware
│   ├── controllers/       # Controladores para cada recurso
│   ├── models/            # Modelos de dados
│   ├── services/          # Serviços compartilhados
│   └── utils/             # Utilitários
├── frontend/              # Interface de usuário
│   ├── public/            # Ativos públicos
│   ├── src/               # Código fonte
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── views/         # Componentes de página
│   │   ├── store/         # Estado centralizado (Vuex)
│   │   ├── services/      # Serviços de API e utilitários
│   │   └── assets/        # Imagens e estilos
├── docs/                  # Documentação
├── scripts/               # Scripts utilitários
└── docker/                # Configurações de contêineres
```

## Pré-requisitos

- Node.js 14.x ou superior
- MongoDB 4.4 ou superior
- Redis 6.x ou superior
- Docker e Docker Compose (opcional, para implantação containerizada)

## Instalação

Consulte o arquivo [INSTALL.md](./INSTALL.md) para instruções detalhadas de instalação e configuração.

## Desenvolvimento

1. Clone este repositório:
```
git clone https://github.com/brunocouto/Monitoramento-GPS-Tarkan.git
cd Monitoramento-GPS-Tarkan
```

2. Instale as dependências:
```
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

3. Configure as variáveis de ambiente:
```
cp backend/.env.example backend/.env
# Edite o arquivo .env com suas configurações
```

4. Inicie os serviços em modo de desenvolvimento:
```
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run serve
```

## Implantação

Para implantar em produção, recomendamos usar Docker:

```
docker-compose up -d
```

Consulte o arquivo [INSTALL.md](./INSTALL.md) para detalhes completos sobre implantação em produção.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](./LICENSE) para detalhes.

## Suporte

Para obter suporte, entre em contato:

- Email: suporte@tarkan.com.br
- Site: [https://tarkan.com.br](https://tarkan.com.br)

---

&copy; 2023-2025 Tarkan Sistemas de Rastreamento. Todos os direitos reservados.