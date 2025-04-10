const buildRoleType = process.env.BUILD_ROLE_TYPE;

let config = {
  "copyright": "Test Electron App.somthing",
  "asar": false,
  "mac": {
    "identity": null,
    "category": "public.app-category.education",
    "entitlements": "./build/entitlements.mac.plist",
    "extendInfo": {
      "NSCameraUsageDescription": "This app requires camera access to record video.",
      "NSMicrophoneUsageDescription": "This app requires microphone access to record audio."
    },
    "sign": false,
    "notarize": false,
    "target": ["dmg", "zip"],
    "hardenedRuntime": true
  },
  "directories": {
    "output": "./release/",
    "app": "./node_modules/main"
  },
  "files": [
    {
      "from": "dist",
      "to": "main",
      "filter": ["!**/*.map"]
    },
    {
      "from": "./node_modules/renderer/dist",
      "to": "renderer",
      "filter": ["!**/*.map"]
    },
    "package.json",
    "!dist",
    "!**/*.pdb",
    "!**/*.dSYM",
    "!**/*.ts",
  ],
  appId: 'com.test-electron-app.test',
  productName: 'electron-app',
  protocols: {
    name: 'electron-app-protocol',
    schemes: ['electron-app'],
  },
  extraMetadata: {
    name: 'electron-app',
    main: 'main/index.js',
  },
};;

module.exports = config;
