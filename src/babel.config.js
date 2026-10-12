module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated v4 moved its worklets transform into
    // react-native-worklets/plugin; it must be listed last.
    plugins: ["react-native-worklets/plugin"],
  };
};
