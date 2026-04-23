FROM node:18-alpine

WORKDIR /app

# Installer les dépendances système pour Playwright
RUN apk add --no-cache \
    chromium \
    firefox \
    webkit-dev \
    libxkbcommon \
    libxdamage

# Copier les fichiers
COPY . .

# Aller au dossier e2e-tests
WORKDIR /app/e2e-tests

# Installer les dépendances npm
RUN npm ci

# Installer les navigateurs Playwright
RUN npx playwright install chromium --with-deps

# Port
EXPOSE 3000

# Définir la variable d'environnement pour le port
ENV PORT=3000

# Démarrer le serveur
CMD ["npm", "run", "ui"]
