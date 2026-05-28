FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app/e2e-tests

# Copier uniquement package.json d'abord pour profiter du cache Docker
COPY e2e-tests/package*.json ./

# Installer les dépendances sans déclencher le postinstall
# (Chromium est déjà présent dans l'image mcr.microsoft.com/playwright)
RUN npm ci --ignore-scripts

# Copier le reste du code
COPY e2e-tests/ .

ENV PORT=3000
EXPOSE 3000

# server.js = interface multi-onglets sur un seul port (correct pour prod)
CMD ["node", "test-runner-ui/server.js"]
