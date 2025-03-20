@echo off
echo Iniciando configuracao do servidor Traccar para Monitoramento GPS Tarkan...
echo.

REM Verificar se o Java esta instalado
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo Erro: Java nao encontrado. Por favor, instale o Java 8 ou superior.
    echo Voce pode baixar o Java em: https://www.java.com/download/
    pause
    exit /b 1
)

REM Verificar se o Traccar esta instalado
if not exist "C:\Program Files\Traccar" (
    echo Traccar nao instalado. Iniciando download e instalacao...
    
    REM Criar pasta temporaria para download
    mkdir temp >nul 2>&1
    cd temp
    
    REM Download do instalador do Traccar
    echo Baixando o instalador do Traccar...
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/traccar/traccar/releases/download/v4.15/traccar-windows-64-4.15.exe', 'traccar-installer.exe')"
    
    if not exist "traccar-installer.exe" (
        echo Erro ao baixar o instalador do Traccar.
        cd ..
        rmdir /s /q temp
        pause
        exit /b 1
    )
    
    echo Instalando o Traccar. Siga as instrucoes na tela do instalador...
    start /wait traccar-installer.exe
    
    cd ..
    rmdir /s /q temp
    
    if not exist "C:\Program Files\Traccar" (
        echo Erro: Instalacao do Traccar falhou ou foi cancelada.
        pause
        exit /b 1
    )
    
    echo Traccar instalado com sucesso.
    echo.
)

REM Parar o servico do Traccar se estiver em execucao
echo Parando o servico do Traccar...
net stop traccar >nul 2>&1

REM Copiar arquivos de configuracao
echo Copiando arquivos de configuracao...
if exist "conf\traccar.xml" (
    copy /Y "conf\traccar.xml" "C:\Program Files\Traccar\conf\traccar.xml" >nul
    echo - traccar.xml copiado
)

if exist "conf\default.xml" (
    copy /Y "conf\default.xml" "C:\Program Files\Traccar\conf\default.xml" >nul
    echo - default.xml copiado
)

REM Criar pasta de logs se nao existir
if not exist "C:\Program Files\Traccar\logs" (
    mkdir "C:\Program Files\Traccar\logs" >nul
    echo Pasta de logs criada.
)

REM Iniciar o servico do Traccar
echo Iniciando o servico do Traccar...
net start traccar >nul 2>&1
if %errorlevel% neq 0 (
    echo Erro ao iniciar o servico do Traccar. Verifique os logs em C:\Program Files\Traccar\logs
    pause
    exit /b 1
)

echo.
echo Configuracao do Traccar concluida com sucesso!
echo.
echo O servidor Traccar esta rodando nos seguintes enderecos:
echo - Interface Web: http://localhost:8082
echo - Portas de dispositivos GPS:
echo   * TK103/GPS103: 5024
echo   * H02: 5025
echo   * Coban: 5026
echo   * Teltonika: 5027
echo   * GT06: 5023
echo.
echo Certifique-se de configurar o banco de dados MySQL conforme as instrucoes 
echo no arquivo docs\TRACCAR_SETUP_PT.md
echo.

pause