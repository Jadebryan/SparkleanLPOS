// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure resolver to handle jsPDF for native platforms
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For native platforms, return empty module for jsPDF to avoid bundling issues
  if (platform !== 'web' && moduleName === 'jspdf') {
    return {
      type: 'empty',
    };
  }
  // Use default resolution for everything else
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

