// packages/admin-panel/src/lib/runtimeConfig.js
let _config = { apiBaseUrl: null, host: null, mediaRoute: "/media", entities: {} };

export function setRuntimeConfig(config) {
  _config = { ..._config, ...config };
  console.log('Setting Admin configs: ', _config)
}

export function getRuntimeConfig() {
  return _config;
}

export function getHost() {
  return _config.host;
}

export function getMediaRoute() {
  return _config.mediaRoute;
}

export function getEntities() {
  return _config.entities;
}

export function getEntity(slug) {
  return _config.entities[slug] ?? null;
}
