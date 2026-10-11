const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support Firebase .cjs modules
config.resolver.sourceExts.push('cjs');

// Disable package exports to allow Metro to resolve firebase subpaths
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
