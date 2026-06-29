FROM mcr.microsoft.com/playwright:v1.59.1-jammy

RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app/e2e-tests

COPY e2e-tests/package*.json ./
RUN npm ci --ignore-scripts
COPY e2e-tests/ .

# Port 4000 : proxy hub + toutes les apps via /{appKey}/
ENV PORT=4000
EXPOSE 4000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "test-runner-ui/start-all.js"]
