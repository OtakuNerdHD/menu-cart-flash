/**
 * Função utilitária para detectar o subdomínio atual
 * Extrai o slug do cliente do subdomínio (ex: padaria-joao.delliapp.com.br)
 */
export const getSubdomain = (): string | null => {
  try {
    const hostname = window.location.hostname;
    
    // Verificar se é localhost (desenvolvimento)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Em ambiente local, verificar parâmetro da URL para simular subdomínio
      const urlParams = new URLSearchParams(window.location.search);
      const clientParam = urlParams.get('client');
      
      if (clientParam) {
        console.log(`Ambiente local: detectado cliente ${clientParam}`);
        return clientParam;
      }
      
      console.log('Ambiente local: modo admin (sem parâmetro client)');
      return null;
    }
    
    // Produção: extrair subdomínio
    const parts = hostname.split('.');
    
    // Se for app.delliapp.com.br (domínio admin), retornar null
    if (parts.length === 4 && parts[0] === 'app' && parts[1] === 'delliapp' && parts[2] === 'com' && parts[3] === 'br') {
      console.log('Produção: modo admin (app.delliapp.com.br)');
      return null;
    }
    
    // Se for subdominio.delliapp.com.br, extrair o subdomínio
    if (parts.length === 4 && parts[1] === 'delliapp' && parts[2] === 'com' && parts[3] === 'br') {
      const subdomain = parts[0];
      console.log(`Produção: detectado subdomínio ${subdomain}`);
      return subdomain;
    }
    
    // Se for delliapp.com.br (domínio raiz), retornar null
    if (parts.length === 3 && parts[0] === 'delliapp' && parts[1] === 'com' && parts[2] === 'br') {
      console.log('Produção: domínio raiz (delliapp.com.br)');
      return null;
    }
    
    console.log(`Hostname não reconhecido: ${hostname}`);
    return null;
    
  } catch (error) {
    console.error('Erro ao detectar subdomínio:', error);
    return null;
  }
};

/**
 * Verifica se está em modo admin (sem subdomínio específico)
 */
export const isAdminMode = (): boolean => {
  return getSubdomain() === null;
};

/**
 * Verifica se está em ambiente de desenvolvimento
 */
export const isDevelopment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};