// Módulo de processamento de posições GPS
(function() {
    // Monitorar quando o app estiver carregado
    document.addEventListener('DOMContentLoaded', function() {
        // Aguardar a inicialização completa do Vue e Vuex
        setTimeout(function() {
            // Interceptar método setPositions antes que seja chamado com dados inválidos
            if (window.app && window.app.$store) {
                const originalCommit = window.app.$store.commit;
                
                window.app.$store.commit = function(type, payload) {
                    // Interceptar commits relacionados a posições
                    if (type === 'setPositions' && payload) {
                        // Garantir que payload seja um array antes de processá-lo
                        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                            console.log('Otimizando formato de posições GPS: convertendo objeto para array');
                            // Converter objeto para array se necessário
                            const correctedPayload = Object.values(payload);
                            return originalCommit.call(this, type, correctedPayload);
                        } else if (payload === null || payload === undefined) {
                            console.log('Dados de posição inválidos: usando array vazio');
                            return originalCommit.call(this, type, []);
                        }
                    }
                    
                    // Chamar o método original para todos os outros casos
                    return originalCommit.apply(this, arguments);
                };
                
                console.log('Módulo de processamento GPS inicializado com sucesso');
            }
        }, 1000); // Aguardar 1 segundo para garantir que o app está inicializado
    });
})();