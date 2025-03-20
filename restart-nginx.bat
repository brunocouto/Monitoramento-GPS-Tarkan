@echo off
echo ===========================================================
echo    Sistema de Monitoramento GPS Tarkan - Reinicialização
echo ===========================================================
echo.

echo [1/4] Verificando ambiente...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker não está em execução. Inicie o Docker e tente novamente.
    echo.
    echo Pressione qualquer tecla para sair...
    pause > nul
    exit /b 1
)

echo [2/4] Limpando cache do sistema...
docker-compose exec nginx rm -rf /var/cache/nginx/*
if %errorlevel% neq 0 (
    echo [AVISO] Não foi possível limpar o cache do Nginx, mas continuaremos com a reinicialização.
) else (
    echo Cache limpo com sucesso.
)

echo [3/4] Reiniciando o servidor...
docker-compose restart nginx

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao reiniciar o servidor. Verifique os logs para mais detalhes.
    echo.
    echo Para verificar os logs, execute: docker-compose logs nginx
    echo.
    echo Pressione qualquer tecla para sair...
    pause > nul
    exit /b 1
) else (
    echo [4/4] Servidor reiniciado com sucesso!
    echo.
    echo ===========================================================
    echo    Sistema pronto para uso!
    echo ===========================================================
    echo.
    echo Acesse o sistema em: http://localhost
    echo.
    echo IMPORTANTE: Limpe o cache do navegador (CTRL+F5) para 
    echo            garantir que as alterações sejam aplicadas.
    echo.
)

echo Pressione qualquer tecla para sair...
pause > nul