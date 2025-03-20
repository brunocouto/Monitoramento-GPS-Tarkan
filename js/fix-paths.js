// Sistema de otimização de recursos e paths
(function() {
    // Executa quando o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', function() {
        // Monitora mudanças no DOM para otimizar recursos
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
                    otimizarEstilo(el);
                } else if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Elemento
                            otimizarElementoRecursivo(node);
                        }
                    });
                }
            });
        });

        // Função para otimizar estilos de um elemento
        function otimizarEstilo(el) {
            let style = el.getAttribute('style');
            if (!style) return;
            
            // Otimizar caminhos de imagens para menor latência
            if (style.includes('/tarkan/assets/custom/')) {
                style = style.replace(/\/tarkan\/assets\/custom\/([\\w.-]+\\.(jpg|png|gif))/g, '/img/$1');
                el.setAttribute('style', style);
            }
        }

        // Função para otimizar recursivamente elementos
        function otimizarElementoRecursivo(el) {
            otimizarEstilo(el);
            
            // Verificar filhos
            if (el.children && el.children.length > 0) {
                Array.from(el.children).forEach(otimizarElementoRecursivo);
            }
        }

        // Otimizar elementos existentes
        document.querySelectorAll('[style*="/tarkan/assets/custom/"]').forEach(otimizarEstilo);

        // Observar futuras mudanças
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style']
        });

        console.log('Sistema de otimização de recursos inicializado');
    });
})();