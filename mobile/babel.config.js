// A project-wide Babel config (not .babelrc), so Jest also compiles the website files the app
// shares from ../src with Expo's preset.
module.exports = function (api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
