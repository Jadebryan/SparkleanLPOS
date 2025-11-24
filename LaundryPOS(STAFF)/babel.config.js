module.exports = function (api) {
  api.cache(() => process.env.NODE_ENV);
  const isProduction = api.env('production');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // Remove console.logs in production
      ...(isProduction ? [
        ['transform-remove-console', {
          exclude: ['error', 'warn'] // Keep error and warn logs
        }]
      ] : []),
    ],
  };
};

