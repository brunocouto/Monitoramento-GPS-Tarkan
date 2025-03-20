# Sistema de Monitoramento GPS com Tarkan

Este repositório contém o código-fonte e as melhorias para o sistema de monitoramento GPS Tarkan, uma solução completa para rastreamento e gerenciamento de frotas.

## Recursos Principais

- **Rastreamento em Tempo Real**: Acompanhe seus veículos em tempo real no mapa com atualizações contínuas
- **Histórico de Rotas**: Visualize e analise rotas percorridas com detalhes completos
- **Alertas Personalizados**: Configure alertas para excesso de velocidade, entrada/saída de zonas e muito mais
- **Interface Responsiva**: Acesse o sistema de qualquer dispositivo, incluindo smartphones e tablets
- **Relatórios Detalhados**: Exporte dados e gere relatórios completos sobre sua frota

## Melhorias Implementadas

1. **Otimização do Firebase SDK**:
   - Configuração eficiente do Firebase para reduzir o uso de recursos e melhorar o tempo de carregamento.

2. **Tratamento Avançado de Dados de Posição**:
   - Implementação de algoritmos robustos para garantir o processamento correto dos dados de posicionamento.

3. **Sistema de Autenticação Aprimorado**:
   - Melhorias na segurança e no gerenciamento de usuários e permissões.

4. **Carregamento Otimizado de Recursos**:
   - Implementação de técnicas de pré-carregamento e cache para melhorar a performance do sistema.

## Requisitos Técnicos

- Docker e Docker Compose
- Navegador moderno (Chrome, Firefox, Edge ou Safari)
- Conexão estável com a internet

## Instalação

Veja o guia completo de instalação em [INSTALL.md](INSTALL.md).

## Arquitetura do Sistema

O sistema utiliza uma arquitetura moderna baseada em:

- Frontend Vue.js com Vuex para gerenciamento de estado
- Serviços de backend otimizados para processamento de dados geoespaciais
- Firebase para características de tempo real
- Nginx como servidor web e proxy reverso

## Documentação

A documentação completa está disponível na pasta `docs` e inclui:

- Manual do usuário
- Manual do administrador
- Guia de desenvolvimento
- API Reference

## Licença

Este projeto é licenciado sob os termos da licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.