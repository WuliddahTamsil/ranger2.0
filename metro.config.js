// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure absolute projectRoot on Windows to prevent metro-file-map path resolution errors
config.projectRoot = path.resolve(__dirname);
config.watchFolders = [config.projectRoot];

module.exports = config;

