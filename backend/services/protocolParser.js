/**
 * Sistema de Monitoramento GPS Tarkan
 * Parser para diferentes protocolos GPS
 */

const logger = require('../utils/logger');
const config = require('../config/config');

// Registrar parsers disponíveis
const parsers = {
  tk103: require('./protocols/tk103'),
  gt06: require('./protocols/gt06'),
  h02: require('./protocols/h02'),
  coban: require('./protocols/coban'),
  teltonika: require('./protocols/teltonika')
};

/**
 * Identifica e processa dados brutos de diferentes protocolos GPS
 * @param {Buffer} data - Dados brutos recebidos do dispositivo
 * @returns {Promise<Object|null>} Resultado do processamento ou null se não puder processar
 */
const parse = async (data) => {
  try {
    // Tentar identificar o protocolo baseado em padrões nos dados
    const protocol = identifyProtocol(data);
    
    if (!protocol) {
      logger.warn('Protocolo não identificado', { 
        dataHex: data.toString('hex').substring(0, 100) + '...' 
      });
      return null;
    }
    
    // Verificar se temos um parser para este protocolo
    if (!parsers[protocol]) {
      logger.warn(`Parser não disponível para protocolo: ${protocol}`);
      return null;
    }
    
    // Processar dados com o parser específico
    const result = await parsers[protocol].parse(data);
    
    if (!result) {
      logger.warn(`Falha ao analisar dados do protocolo: ${protocol}`, {
        dataHex: data.toString('hex').substring(0, 100) + '...'
      });
      return null;
    }
    
    // Adicionar informação do protocolo ao resultado
    result.protocol = protocol;
    
    // Retornar resultado
    return result;
  } catch (error) {
    logger.error('Erro ao analisar dados do protocolo', {
      error: error.message,
      stack: error.stack,
      dataHex: data.toString('hex').substring(0, 100) + '...'
    });
    
    return null;
  }
};

/**
 * Tenta identificar o protocolo com base nos dados recebidos
 * @param {Buffer} data - Dados brutos recebidos do dispositivo
 * @returns {string|null} Nome do protocolo ou null se não for identificado
 */
const identifyProtocol = (data) => {
  // Converter para string e hex para facilitar a identificação
  const dataStr = data.toString('utf8');
  const dataHex = data.toString('hex');
  
  // Verificar protocolos por padrões característicos
  
  // TK103 (GPRS protocol)
  if (dataStr.includes('imei:') || dataStr.match(/\([\d]+\)/) || 
      dataStr.includes('GPRMC') || dataStr.includes('BP00')) {
    return 'tk103';
  }
  
  // GT06/GT06N/GT06E
  if (data.length >= 2 && data[0] === 0x78 && data[1] === 0x78) {
    return 'gt06';
  }
  
  // H02
  if ((dataStr.startsWith('*') && dataStr.includes('V1')) ||
      dataStr.match(/^\*[A-Z]{2}\d{2},/) || 
      dataStr.includes('GPRMC')) {
    return 'h02';
  }
  
  // Coban
  if (dataStr.includes('##,imei:') || dataStr.match(/GPRMC,.+LOGMSG/)) {
    return 'coban';
  }
  
  // Teltonika (binário)
  if (data.length > 10 && data.readUInt32BE(0) === data.length - 4) {
    return 'teltonika';
  }
  
  // Adicionar mais identificadores de protocolo conforme necessário
  
  // Protocolo não identificado
  return null;
};

// Template para criar parsers específicos para cada protocolo
const createParserTemplate = (protocolName) => {
  const parserTemplate = `/**
 * Parser para protocolo ${protocolName}
 */

module.exports = {
  /**
   * Processa dados do protocolo ${protocolName}
   * @param {Buffer} data - Dados brutos recebidos
   * @returns {Object|null} Dados processados ou null em caso de erro
   */
  parse: async (data) => {
    try {
      // Implementar lógica específica para o protocolo ${protocolName}
      
      // Exemplo de retorno
      return {
        deviceId: 'extrair-do-pacote',
        position: {
          deviceTime: new Date(),
          fixTime: new Date(),
          latitude: 0.0,
          longitude: 0.0,
          altitude: 0.0,
          speed: 0.0,
          course: 0.0,
          valid: false,
          attributes: {}
        },
        // Resposta opcional para enviar de volta ao dispositivo
        response: null
      };
    } catch (error) {
      return null;
    }
  }
};`;

  return parserTemplate;
};

// Gerar parsers para protocolos suportados
const generateParsers = () => {
  const result = {};
  
  for (const protocol of config.protocolServer.supportedProtocols) {
    result[protocol] = createParserTemplate(protocol);
  }
  
  return result;
};

// Exportar funções
module.exports = {
  parse,
  identifyProtocol,
  getSupportedProtocols: () => Object.keys(parsers),
  createParserTemplate,
  generateParsers
};