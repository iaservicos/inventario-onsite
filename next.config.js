/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Impede que o site seja embutido em iframes de outros domínios (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Impede que o browser "adivinhe" o Content-Type do response
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Força HTTPS por 1 ano (incluindo subdomínios)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Não envia Referer ao sair do site
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desabilita features de browser desnecessárias
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Proteção básica XSS para browsers antigos
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
