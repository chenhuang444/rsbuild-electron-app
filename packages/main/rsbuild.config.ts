import { defineConfig } from '@rsbuild/core';

export default defineConfig(_config => {
  return {
    environments: {
      main: {
        /** electron 主进程相关配置 */
        source: {
          entry: {
            index: ['./src/main.ts'],
          },
        },
        tools: {
          rspack: async (rspackConfig, { appendPlugins, mergeConfig }) => {
            return mergeConfig(rspackConfig, {
              target: ['electron26.6-main'],
            });
          },
        },
        output: {
        },
      },
    },
    source: {
    },
    performance: {
      printFileSize: {
        total: true,
        detailed: true,
        compressed: true,
      },
    },
    output: {
      // minify: buildEnv !== 'dev',
      minify: false,
      target: 'node',
      sourceMap: true,
      externals: [
        {
          '@electron/remote': 'commonjs @electron/remote',
          "electron": "commonjs electron",
          "@sentry/electron": "commonjs @sentry/electron",
          "electron-log": "commonjs electron-log",
          "@sentry/integrations": "commonjs @sentry/integrations",
          "network": "commonjs network"
        },
      ],
    },
  };
});
