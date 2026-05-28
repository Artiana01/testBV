FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app/e2e-tests

COPY e2e-tests/package*.json ./
RUN npm ci --ignore-scripts
COPY e2e-tests/ .

# Port 4000 : proxy hub + toutes les apps via /{appKey}/
ENV PORT=4000
EXPOSE 4000

CMD ["node", "test-runner-ui/start-all.js"]
