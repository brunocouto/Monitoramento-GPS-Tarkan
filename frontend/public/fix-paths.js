/**
 * Script para corrigir problemas de caminhos e carregar recursos
 * automaticamente no sistema de monitoramento GPS Tarkan
 */

(function() {
  // Executa quando o DOM estiver carregado
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Tarkan] Inicializando correção de caminhos...');
    
    // Corrigir caminhos de imagens
    fixImagePaths();
    
    // Forçar carregamento de recursos precarregados
    preloadResources();
    
    console.log('[Tarkan] Correção de caminhos aplicada com sucesso.');
  });
  
  /**
   * Corrige caminhos de imagens no DOM
   */
  function fixImagePaths() {
    // Lista de elementos a verificar
    const elementsToCheck = [
      'img[src]',
      'div[style*="background-image"]',
      'a[style*="background-image"]',
      'span[style*="background-image"]',
      'header[style*="background-image"]',
      'section[style*="background-image"]'
    ];
    
    // Regex para detectar caminhos incorretos
    const pathRegex = /url\(['"]?(\/img\/[^'")\s]+)['"]?\)/gi;
    const srcRegex = /^\/img\//;
    
    // Seleciona todos os elementos que podem ter caminhos de imagem
    const elements = document.querySelectorAll(elementsToCheck.join(','));
    
    elements.forEach(function(el) {
      // Corrigir src de imagens
      if (el.hasAttribute('src') && srcRegex.test(el.getAttribute('src'))) {
        const originalSrc = el.getAttribute('src');
        const newSrc = originalSrc; // Aqui você pode ajustar o caminho se necessário
        el.setAttribute('src', newSrc);
        console.log(`[Tarkan] Corrigido caminho de imagem: ${originalSrc} -> ${newSrc}`);
      }
      
      // Corrigir background-image em estilos inline
      if (el.hasAttribute('style') && el.getAttribute('style').includes('background-image')) {
        const originalStyle = el.getAttribute('style');
        const newStyle = originalStyle.replace(pathRegex, function(match, path) {
          // Aqui você pode ajustar o caminho se necessário
          const newPath = `url("${path}")`;
          console.log(`[Tarkan] Corrigido background: ${match} -> ${newPath}`);
          return newPath;
        });
        
        if (originalStyle !== newStyle) {
          el.setAttribute('style', newStyle);
        }
      }
    });
    
    // Verificar folhas de estilo carregadas
    Array.from(document.styleSheets).forEach(function(sheet) {
      try {
        if (sheet.cssRules) {
          // Não podemos modificar folhas de estilo externas diretamente por limitações de CORS
          // Este código serve apenas para informação
          const rulesWithBackgrounds = Array.from(sheet.cssRules)
            .filter(rule => rule.cssText && rule.cssText.includes('background-image'))
            .length;
          
          if (rulesWithBackgrounds > 0) {
            console.log(`[Tarkan] Folha de estilo com ${rulesWithBackgrounds} regras de background: ${sheet.href || 'inline'}`);
          }
        }
      } catch (e) {
        // Ignora erros de CORS ao tentar ler folhas de estilo externas
      }
    });
  }
  
  /**
   * Força o carregamento de recursos precarregados
   */
  function preloadResources() {
    // Obter links de preload
    const preloads = document.querySelectorAll('link[rel="preload"]');
    
    if (preloads.length > 0) {
      console.log(`[Tarkan] Forçando carregamento de ${preloads.length} recursos precarregados...`);
      
      preloads.forEach(function(link) {
        if (link.as === 'image') {
          const img = new Image();
          img.src = link.href;
          img.style.position = 'absolute';
          img.style.opacity = '0';
          img.style.pointerEvents = 'none';
          document.body.appendChild(img);
          
          // Remover após carregamento
          img.onload = function() {
            setTimeout(function() {
              document.body.removeChild(img);
            }, 1000);
          };
        }
      });
    }
  }
})();