# Shopify → Jasmin Integration

Integra automaticamente encomendas do Shopify no Jasmin.

## Instalação
1. npm install
2. Copiar `.env.example` para `.env`
3. Preencher credenciais Shopify e Jasmin
4. npm start

## Webhook no Shopify
Criar webhook:
- Topic: orders/create
- URL: https://YOUR_DOMAIN/webhooks/orders/create
- Formato: JSON
