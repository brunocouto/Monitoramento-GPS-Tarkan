# Guia de Instalação - Sistema de Monitoramento GPS Tarkan

Este guia fornece instruções detalhadas para instalar e configurar o Sistema de Monitoramento GPS Tarkan em diferentes ambientes.

## Requisitos de Sistema

### Hardware Recomendado
- CPU: 2 cores ou mais
- RAM: 4GB ou mais
- Armazenamento: 20GB ou mais

### Software Necessário
- Sistema Operacional: Windows 10/11, Ubuntu 20.04+ ou similares
- Node.js 14.x ou superior
- MySQL 8.0 ou superior
- Docker (opcional, para implantação containerizada)

## Instalação Direta (Sem Docker)

### 1. Configurar o Banco de Dados MySQL

```sql
CREATE DATABASE traccar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'traccar_user'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON traccar_db.* TO 'traccar_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Clonar o Repositório

```bash
git clone https://github.com/brunocouto/Monitoramento-GPS-Tarkan.git
cd Monitoramento-GPS-Tarkan
```

### 3. Configurar o Backend

```bash
cd backend
cp .env.example .env
# Edite o arquivo .env com suas configurações
npm install
```

### 4. Configurar o Frontend

```bash
cd ../frontend
npm install
```

### 5. Iniciar os Serviços

```bash
# Iniciar o Backend
cd backend
npm start

# Em outro terminal, iniciar o Frontend
cd frontend
npm run serve
```

O sistema estará disponível em `http://localhost:8080`.

## Instalação com Docker

### 1. Clonar o Repositório

```bash
git clone https://github.com/brunocouto/Monitoramento-GPS-Tarkan.git
cd Monitoramento-GPS-Tarkan
```

### 2. Configurar Variáveis de Ambiente

```bash
cp backend/.env.example backend/.env
# Edite o arquivo .env conforme necessário
```

### 3. Iniciar com Docker Compose

```bash
docker-compose up -d
```

O sistema estará disponível em `http://localhost:80`.

## Configuração do Traccar

O Sistema de Monitoramento GPS Tarkan pode ser integrado ao Traccar, um servidor de rastreamento de código aberto.

### 1. Instalação do Traccar

Baixe o instalador do Traccar do site oficial: `https://www.traccar.org/download/`

### 2. Configuração

Após a instalação, configure o arquivo de configuração do Traccar:

```bash
cd traccar/conf
nano traccar.xml
```

Adicione as seguintes configurações:

```xml
<entry key='database.driver'>com.mysql.jdbc.Driver</entry>
<entry key='database.url'>jdbc:mysql://localhost:3306/traccar_db?serverTimezone=UTC&amp;useSSL=false&amp;allowMultiQueries=true</entry>
<entry key='database.user'>traccar_user</entry>
<entry key='database.password'>senha_segura</entry>

<entry key='web.enable'>true</entry>
<entry key='web.port'>8082</entry>
<entry key='web.path'>./web</entry>
```

### 3. Iniciar o Traccar

No Windows:
```
cd traccar
traccar.exe
```

No Linux:
```bash
cd traccar
./traccar.sh
```

O servidor Traccar estará disponível em `http://localhost:8082`.

## Atualizando o Sistema

### Atualização sem Docker

```bash
cd Monitoramento-GPS-Tarkan
git pull

# Atualizar Backend
cd backend
npm install
npm run migrate

# Atualizar Frontend
cd ../frontend
npm install
npm run build
```

### Atualização com Docker

```bash
cd Monitoramento-GPS-Tarkan
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Configurações Avançadas

### Configuração HTTPS

Para configurar HTTPS, você precisará gerar certificados SSL e atualizar a configuração do Nginx.

### Balanceamento de Carga

Para instalações com alta carga, considere utilizar um balanceador de carga como Nginx ou HAProxy.

### Backup e Recuperação

Recomendamos configurar backups regulares do banco de dados:

```bash
# Backup
mysqldump -u traccar_user -p traccar_db > backup.sql

# Restauração
mysql -u traccar_user -p traccar_db < backup.sql
```

## Solução de Problemas

### Problemas Comuns

1. **Falha de Conexão com Banco de Dados**
   - Verifique as credenciais no arquivo .env
   - Certifique-se de que o serviço MySQL está em execução

2. **Problemas com Porta em Uso**
   - Verifique se as portas 3000 (backend) e 8080 (frontend) estão disponíveis
   - Altere as portas no arquivo de configuração se necessário

3. **Erros no Frontend**
   - Limpe o cache do navegador
   - Verifique os logs em `/frontend/logs`

Para suporte adicional, consulte a documentação completa ou abra uma issue no repositório GitHub.