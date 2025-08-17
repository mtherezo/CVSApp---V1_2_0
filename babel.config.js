// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ESTA LINHA É ESSENCIAL PARA AS ANIMAÇÕES FUNCIONAREM
      'react-native-reanimated/plugin',
    ],
  };
};