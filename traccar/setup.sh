#!/bin/bash

echo "Iniciando configuração do servidor Traccar para Monitoramento GPS Tarkan..."
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "Este script precisa ser executado como root (use sudo)"
  exit 1
fi

# Verificar se o Java está instalado
if ! command -v java &> /dev/null; then
    echo "Java não encontrado. Instalando Java..."
    apt-get update
    apt-get install -y openjdk-11-jre-headless
    
    if ! command -v java &> /dev/null; then
        echo "Erro: Falha ao instalar o Java. Por favor, instale manualmente."
        exit 1
    fi
    
    echo "Java instalado com sucesso."
fi

# Verificar versão do Java
java_version=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
echo "Versão do Java: $java_version"

# Verificar se o Traccar já está instalado
if [ ! -d "/opt/traccar" ]; then
    echo "Traccar não instalado. Iniciando download e instalação..."
    
    # Criar pasta temporária para download
    mkdir -p /tmp/traccar_install
    cd /tmp/traccar_install
    
    # Download do instalador do Traccar
    echo "Baixando o instalador do Traccar..."
    wget -O traccar.zip https://github.com/traccar/traccar/releases/download/v4.15/traccar-linux-64-4.15.zip
    
    if [ ! -f "traccar.zip" ]; then
        echo "Erro ao baixar o instalador do Traccar."
        cd -
        rm -rf /tmp/traccar_install
        exit 1
    fi
    
    # Descompactar e instalar
    unzip traccar.zip
    chmod +x traccar.run
    ./traccar.run
    
    # Limpeza
    cd -
    rm -rf /tmp/traccar_install
    
    if [ ! -d "/opt/traccar" ]; then
        echo "Erro: Instalação do Traccar falhou."
        exit 1
    fi
    
    echo "Traccar instalado com sucesso."
    echo ""
fi

# Parar o serviço do Traccar se estiver em execução
echo "Parando o serviço do Traccar..."
systemctl stop traccar.service

# Copiar arquivos de configuração
echo "Copiando arquivos de configuração..."
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

if [ -f "$SCRIPT_DIR/conf/traccar.xml" ]; then
    cp -f "$SCRIPT_DIR/conf/traccar.xml" /opt/traccar/conf/traccar.xml
    echo "- traccar.xml copiado"
fi

if [ -f "$SCRIPT_DIR/conf/default.xml" ]; then
    cp -f "$SCRIPT_DIR/conf/default.xml" /opt/traccar/conf/default.xml
    echo "- default.xml copiado"
fi

# Ajustar permissões
chown -R traccar:traccar /opt/traccar/conf/

# Criar pasta de logs se não existir
if [ ! -d "/opt/traccar/logs" ]; then
    mkdir -p /opt/traccar/logs
    chown traccar:traccar /opt/traccar/logs
    echo "Pasta de logs criada."
fi

# Iniciar o serviço do Traccar
echo "Iniciando o serviço do Traccar..."
systemctl start traccar.service

# Verificar se o serviço iniciou corretamente
if ! systemctl is-active --quiet traccar.service; then
    echo "Erro ao iniciar o serviço do Traccar. Verifique os logs:"
    echo "tail -f /opt/traccar/logs/tracker-server.log"
    exit 1
fi

# Configurar para iniciar automaticamente
systemctl enable traccar.service

echo ""
echo "Configuração do Traccar concluída com sucesso!"
echo ""
echo "O servidor Traccar está rodando nos seguintes endereços:"
echo "- Interface Web: http://$(hostname -I | awk '{print $1}'):8082"
echo "- Portas de dispositivos GPS:"
echo "  * TK103/GPS103: 5024"
echo "  * H02: 5025"
echo "  * Coban: 5026"
echo "  * Teltonika: 5027"
echo "  * GT06: 5023"
echo ""
echo "Certifique-se de configurar o banco de dados MySQL conforme as instruções"
echo "no arquivo docs/TRACCAR_SETUP_PT.md"
echo ""
echo "Para verificar o status do serviço: systemctl status traccar.service"
echo "Para visualizar os logs: tail -f /opt/traccar/logs/tracker-server.log"
echo "