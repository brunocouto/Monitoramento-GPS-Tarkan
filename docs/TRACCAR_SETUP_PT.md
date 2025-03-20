# Guia de Configuração do Traccar para Monitoramento GPS Tarkan

Este guia detalha como instalar e configurar o servidor Traccar para funcionar com o sistema de Monitoramento GPS Tarkan.

## Introdução

Traccar é um servidor de rastreamento GPS open source que suporta mais de 170 protocolos e dispositivos diferentes. O Monitoramento GPS Tarkan utiliza o Traccar como parte do seu backend para processar dados GPS de diferentes dispositivos.

## Requisitos do Sistema

- Java 8 ou superior
- Banco de dados MySQL
- Porta disponível para web interface (padrão: 8082)
- Portas disponíveis para protocolos GPS (5023-5027)

## Instalação

### Windows

1. Faça o download da última versão do Traccar em [traccar.org/download](https://www.traccar.org/download/)
2. Execute o instalador e siga as instruções
3. O serviço será instalado automaticamente
4. Substitua os arquivos de configuração pelos fornecidos na pasta `traccar/conf` deste repositório

### Linux

1. Instale o Java:
   ```bash
   sudo apt update
   sudo apt install openjdk-11-jre-headless
   ```

2. Faça o download e instale o Traccar:
   ```bash
   wget https://github.com/traccar/traccar/releases/download/v4.15/traccar-linux-64-4.15.zip
   unzip traccar-linux-64-4.15.zip
   sudo ./traccar.run
   ```

3. Substitua os arquivos de configuração:
   ```bash
   sudo cp /caminho/para/traccar/conf/* /opt/traccar/conf/
   ```

4. Reinicie o serviço:
   ```bash
   sudo systemctl restart traccar
   ```

## Configuração

### Banco de Dados

Edite o arquivo `traccar.xml` na pasta de configuração para definir as configurações do banco de dados:

```xml
<entry key='database.driver'>com.mysql.jdbc.Driver</entry>
<entry key='database.url'>jdbc:mysql://localhost:3306/traccar_db?serverTimezone=UTC&amp;useSSL=false&amp;allowMultiQueries=true</entry>
<entry key='database.user'>traccar_user</entry>
<entry key='database.password'>sua_senha</entry>
```

Assegure-se de criar o banco de dados e o usuário no MySQL:

```sql
CREATE DATABASE traccar_db;
CREATE USER 'traccar_user'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON traccar_db.* TO 'traccar_user'@'localhost';
FLUSH PRIVILEGES;
```

### Protocolos GPS

O arquivo `traccar.xml` já vem configurado com as portas para vários protocolos comuns:

- TK103/GPS103: Porta 5024
- H02: Porta 5025
- Coban: Porta 5026
- Teltonika: Porta 5027
- GT06: Porta 5023

Adicione ou remova protocolos conforme necessário.

### Integração com o Sistema Tarkan

Para integrar o Traccar com o sistema Tarkan:

1. Configure a API do Traccar:
   ```xml
   <entry key='api.enable'>true</entry>
   <entry key='api.port'>8083</entry>
   <entry key='api.key'>tarkan_api_key_change_this</entry>
   ```

2. Habilite CORS para permitir acesso da interface web Tarkan:
   ```xml
   <entry key='web.cors.enable'>true</entry>
   <entry key='web.cors.origin'>*</entry>
   ```

## Verificando a Instalação

1. Acesse a interface web do Traccar em `http://seu_servidor:8082/`
2. Faça login com o usuário padrão (admin/admin)
3. Altere a senha padrão imediatamente
4. Verifique se a conexão com o banco de dados está funcionando
5. Adicione um dispositivo de teste para verificar se o servidor está recebendo os dados

## Solução de Problemas

### Logs

Os logs do Traccar estão disponíveis em:
- Windows: `C:\Program Files\Traccar\logs\tracker-server.log`
- Linux: `/opt/traccar/logs/tracker-server.log`

### Problemas Comuns

- **Erro de Conexão com o Banco de Dados**: Verifique as credenciais e se o servidor MySQL está em execução
- **Dispositivo Não Aparece**: Verifique se a porta do protocolo está aberta no firewall
- **Servidor Não Inicia**: Verifique os logs para identificar o problema

## Referências

- [Documentação Oficial do Traccar](https://www.traccar.org/documentation/)
- [Protocolos Suportados](https://www.traccar.org/devices/)
- [Fórum de Suporte](https://www.traccar.org/forums/)