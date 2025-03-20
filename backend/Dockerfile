FROM node:16-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Expor portas
EXPOSE 3000
EXPOSE 5023

# Iniciar aplicação
CMD ["node", "server.js"]