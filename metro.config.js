// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit Metro workers to prevent system overload
// DO NOT MODIFY: This is intentionally set to 2 for system stability
config.maxWorkers = 2;

module.exports = withNativeWind(config, { input: './global.css' });
