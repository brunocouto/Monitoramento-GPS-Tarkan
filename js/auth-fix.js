// Módulo de autenticação e gerenciamento de perfis
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Monitorar quando o app estiver carregado
        setTimeout(function() {
            // Verificar se o objeto window.app existe
            if (window.app && window.app.$store) {
                // Interceptar o método setAuth para garantir integridade dos dados
                const originalDispatch = window.app.$store.dispatch;
                
                window.app.$store.dispatch = function(type, payload) {
                    // Se for uma ação relacionada à autenticação
                    if (type === 'setAuth' && payload) {
                        // Garantir que todas as propriedades essenciais existam
                        if (payload.user && !payload.user.isShared) {
                            payload.user.isShared = false; // Valor padrão
                        }
                        
                        // Verificar e corrigir outros valores possivelmente indefinidos
                        if (payload.user) {
                            // Garantir que propriedades comuns existam
                            payload.user = {
                                ...payload.user,
                                id: payload.user.id || null,
                                name: payload.user.name || '',
                                email: payload.user.email || '',
                                // Adicione outras propriedades essenciais
                                role: payload.user.role || 'user',
                                lastLogin: payload.user.lastLogin || new Date().toISOString()
                            };
                        }
                    }
                    
                    // Chamar o método original
                    return originalDispatch.apply(this, arguments);
                };
                
                console.log('Sistema de autenticação e perfis inicializado');
            }
        }, 1000); // Aguardar 1 segundo para garantir que o app está inicializado
    });
})();