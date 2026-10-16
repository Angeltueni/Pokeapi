const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

config.resolver.unstable_enablePackageExports = true;

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader(
      'Cross-Origin-Embedder-Policy',
      'credentialless'
    );
    res.setHeader(
      'Cross-Origin-Opener-Policy',
      'same-origin'
    );

    return middleware(req, res, next);
  };
};

const defaultCustomSerializer = config.serializer?.customSerializer;
if (defaultCustomSerializer) {
  config.serializer.customSerializer = async (entryPoint, preModules, graph, options) => {
    // Skip worker chunks in lazy development bundles when not yet traversed in graph.dependencies
    const modifiedDeps = [];
    if (graph?.dependencies) {
      for (const module of graph.dependencies.values()) {
        if (module.dependencies) {
          for (const dep of module.dependencies.values()) {
            if (dep.data?.data?.asyncType === 'worker' && !graph.dependencies.has(dep.absolutePath)) {
              dep.data.data.asyncType = null;
              modifiedDeps.push(dep);
            }
          }
        }
      }
    }

    try {
      return await defaultCustomSerializer(entryPoint, preModules, graph, options);
    } finally {
      for (const dep of modifiedDeps) {
        dep.data.data.asyncType = 'worker';
      }
    }
  };
}

module.exports = config;
