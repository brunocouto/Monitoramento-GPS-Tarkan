# Guia de Instalação do Sistema de Monitoramento GPS Tarkan

Este guia fornece instruções detalhadas para instalar e configurar o sistema de monitoramento GPS Tarkan.

## Pré-requisitos

- Docker e Docker Compose instalados e funcionando
- Servidor com pelo menos 2GB de RAM e 1 CPU
- Acesso de administrador ao sistema operacional
- Sistema Tarkan base já instalado

## Passos para Instalação

### 1. Obter o Código Fonte

Clone este repositório:

```bash
git clone https://github.com/brunocouto/Monitoramento-GPS-Tarkan.git
```

Ou baixe como arquivo ZIP e extraia em seu servidor.

### 2. Configuração do Ambiente

#### 2.1 Estrutura de Diretórios

Organize os arquivos nas seguintes pastas:

```
└── frontend/
    └── public/
        ├── js/
        │   ├── firebase-config.js
        │   ├── positions-fix.js
        │   ├── auth-fix.js
        │   └── fix-paths.js
        ├── css/
        │   └── app-fixes.css
        └── index.html (substitua pelo nosso index-template.html)
```

#### 2.2 Copiar Arquivos

Copie os arquivos para as pastas corretas na sua instalação do Tarkan:

- Arquivos JavaScript (`.js`) para a pasta `frontend/public/js/`
- Arquivos CSS para a pasta `frontend/public/css/`
- Renomeie `index-template.html` para `index.html` e coloque-o em `frontend/public/`
- Coloque o script `restart-nginx.bat` na raiz do projeto

### 3. Iniciar o Sistema

Execute o script `restart-nginx.bat` para reiniciar o servidor Nginx e limpar os caches:

```bash
./restart-nginx.bat
```

### 4. Verificação da Instalação

1. Abra seu navegador e acesse `http://localhost` (ou o endereço configurado para seu servidor)
2. Limpe o cache do navegador:
   - Chrome/Edge: `Ctrl+F5`
   - Firefox: `Ctrl+Shift+R`
   - Safari: `Cmd+Option+R`
3. Verifique no console do navegador (F12) se os erros foram corrigidos

## Configurações Avançadas

### Personalização do Sistema

Para personalizar o sistema, você pode modificar:

- Logotipos e imagens na pasta `frontend/public/img/`
- Cores e estilos no arquivo `frontend/public/css/app-fixes.css`

### Configuração do Firebase

Se você utiliza o Firebase, certifique-se de descomentar os módulos necessários no arquivo `firebase-config.js`.

## Solução de Problemas

### Erros Comuns

#### O mapa não carrega:
- Verifique as chaves de API do Google Maps no arquivo `config.js`
- Certifique-se de que o navegador tem permissão para acessar sua localização

#### Erro de conexão com o servidor:
- Verifique se o Docker está em execução
- Verifique se a porta 80 não está sendo usada por outro aplicativo

### Logs para Diagnóstico

Para verificar logs do Nginx:

```bash
docker-compose logs nginx
```

Para verificar logs da aplicação:

```bash
docker-compose logs app
```

## Suporte

Se encontrar problemas, abra uma issue no GitHub com:

- Descrição detalhada do problema
- Capturas de tela dos erros 
- Informações sobre seu ambiente (SO, navegador, versões)

## Atualização do Sistema

Para atualizar o sistema para versões mais recentes:

1. Faça backup dos seus dados
2. Clone a versão mais recente do repositório
3. Siga as instruções de instalação acima
4. Restaure seus dados de backup se necessário