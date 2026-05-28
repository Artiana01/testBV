FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app/e2e-tests

# Copier package.json en premier pour profiter du cache Docker
COPY e2e-tests/package*.json ./

# Installer sans déclencher le postinstall (Chromium déjà dans l'image base)
RUN npm ci --ignore-scripts

# Copier le reste du code
COPY e2e-tests/ .

# Hub central
EXPOSE 4000

# Serveurs par app
EXPOSE 4001
EXPOSE 4002
EXPOSE 4003
EXPOSE 4004
EXPOSE 4005
EXPOSE 4006
EXPOSE 4007
EXPOSE 4008

# PUBLIC_HOST : à surcharger avec l'IP/domaine du serveur en prod
# Ex: docker run -e PUBLIC_HOST=187.124.95.146 ...
ENV PUBLIC_HOST=localhost

# Lance le hub + tous les serveurs d'app
CMD ["node", "test-runner-ui/start-all.js"]
