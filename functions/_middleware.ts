// Cloudflare Pages Functions middleware para roteamento de subdomínios
export async function onRequest(context: any) {
  const { request, next } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // Log para debug
  console.log('Middleware - Hostname:', hostname);
  
  // Verificar se é um subdomínio de cliente
  if (hostname.includes('.delliapp.com.br') && !hostname.startsWith('app.')) {
    // Extrair o subdomínio
    const subdomain = hostname.split('.')[0];
    console.log('Cliente subdomain detectado:', subdomain);
    
    // Adicionar header para identificar o cliente
    const response = await next();
    response.headers.set('X-Client-Subdomain', subdomain);
    return response;
  }
  
  // Para outros casos, continuar normalmente
  return next();
}