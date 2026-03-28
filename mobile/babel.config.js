module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@lib': './src/lib',
            '@hooks': './src/hooks',
            '@stores': './src/stores',
            '@utils': './src/utils',
            '@i18n': './src/i18n',
            '@native': './src/native',
          },
        },
      ],
    ],
  };
};
