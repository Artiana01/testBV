/**
 * launch.js — wrapper pour lancer un app-server avec APP_KEY et PORT
 * Usage : node test-runner-ui/launch.js <appKey> <port>
 * Exemple : node test-runner-ui/launch.js creerailleurs 4007
 */
const [,, appKey, port] = process.argv;
if (!appKey || !port) {
  console.error('Usage: node launch.js <appKey> <port>');
  process.exit(1);
}
process.env.APP_KEY = appKey;
process.env.PORT    = port;
require('./app-server.js');
