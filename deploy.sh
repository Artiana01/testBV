#!/bin/bash
set -e

echo "📦 Pull du code..."
git pull origin main

echo "🔨 Build de l'image Docker..."
docker build -t e2e-tests .

echo "🔄 Redémarrage du conteneur..."
docker stop e2e-tests-prod 2>/dev/null || true
docker rm   e2e-tests-prod 2>/dev/null || true

docker run -d \
  --name e2e-tests-prod \
  --restart unless-stopped \
  -p 4000:4000 \
  -p 4001:4001 \
  -p 4002:4002 \
  -p 4003:4003 \
  -p 4004:4004 \
  -p 4005:4005 \
  -p 4006:4006 \
  -p 4007:4007 \
  -p 4008:4008 \
  e2e-tests

echo "✅ Déployé ! Hub → http://$(hostname -I | awk '{print $1}'):4000"
