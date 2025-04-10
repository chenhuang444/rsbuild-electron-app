import { type RsbuildConfig, defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { Logger } from 'sass';

type ToolsConfig = NonNullable<RsbuildConfig['tools']>;
type RspackConfig = NonNullable<ToolsConfig['rspack']>;

export default defineConfig(async _config => {
  const modRspack: RspackConfig = (rspackConfig, rspackUtils) => {
    rspackConfig.target = 'electron-renderer';
    const { addRules, appendPlugins } = rspackUtils;
    addRules({
      /**
       * 将 xxx.worker.js 转换为 WebWorker Constructor
       * xxx.worker.mjs, xxx.worker.cjs
       */
      test: /\.worker\.(m|c)?js$/,
      enforce: 'pre',
      loader: 'worker-rspack-loader',
    });
  };

  return {
    source: {
      entry: {
        index: './src/main.tsx',
      },
    },
    plugins: [
      pluginReact(),
      pluginSass({ sassLoaderOptions: { sassOptions: { logger: Logger.silent } } }),
      pluginSvgr(),
    ],
    dev: {
      hmr: false,
    },
    output: {
      minify: false,
      sourceMap: true,
      /**
       * 需要相对路径加载，否则 file:// 协议无法找到正确的 root
       */
      assetPrefix: 'auto',
    },
    tools: {
      rspack: modRspack,
    },
    server: {
      port: Number(process.env.OUTROOM_PORT) || 6001,
    },
  };
});
