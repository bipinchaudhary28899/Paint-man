// Metro for the Paint Saathi app. The app shares the website's business facts and form checks
// (../src/config, ../src/lib/leads, the project stages in ../src/lib/projects) and its brand art, uniform photos and wall mask (../public/brand,
// ../public/photos, ../public/scenes) instead of copying them, so Metro watches those folders as well as this one.
// `@/` in tsconfig.json points at the website's src, so the shared files' own imports resolve.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const webRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.join(webRoot, "src/config"),
  path.join(webRoot, "src/lib/leads"),
  path.join(webRoot, "src/lib/colours"),
  path.join(webRoot, "src/lib/projects"),
  path.join(webRoot, "public/brand"),
  path.join(webRoot, "public/photos"),
  path.join(webRoot, "public/scenes"),
];
// The shared files import no packages; anything they ever do comes from the app's node_modules.
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];

module.exports = config;
