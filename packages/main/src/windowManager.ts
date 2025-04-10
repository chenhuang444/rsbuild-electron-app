import path from 'path';
/* eslint-disable @typescript-eslint/no-shadow */
import { net, BrowserWindow, type BrowserWindowConstructorOptions, app, ipcMain, screen } from 'electron';
import log from 'electron-log';
import { webRequestMonitor } from './performance/cdnPerformance';
import {
  cosmoMaxHeight,
  cosmoMaxWidth,
  cosmoMinHeight,
  cosmoMinWidth,
  cosmoOriginHeight,
  cosmoOriginWidth,
  getSession,
  getTitle,
  minHeight,
  minWidth,
} from './util';

const [, ...args] = process.argv;
const serve = process.defaultApp ?? false;
const devTools = true;

const enableCors = (session: Electron.Session) => {
  session.webRequest.onBeforeSendHeaders({ urls: [] }, (details, callback) => {
    // @ts-expect-error
    // eslint-disable-next-line no-param-reassign
    details.requestHeaders.Origin = null;
    callback({ requestHeaders: details.requestHeaders });
  });
};

const registerFileProtocol = (session: Electron.Session) => {
  const TestResource = 'test-resource';
  // 看起来，针对同一个 session，相同的 scheme 只能 handle 一次，如果多次 createWindow，后续的 window 不需要再 register
  if (session.protocol.isProtocolHandled(TestResource)) return;
  session.protocol.handle(TestResource, request =>
    net.fetch('file://' + path.join(__dirname, './assets', request.url.replace(`${TestResource}://`, ''))),
  );
};

let hasCertificateError = false;

class WindowManager {
  private windows: { [key: string]: BrowserWindow } = {};

  constructor() {
    ipcMain.on('window_setPosition', (_, args) => {
      // @ts-expect-error
      this.setPosition(args.name, ...args.options);
    });
    ipcMain.on('window_setSize', (_, args) => {
      // @ts-expect-error
      this.setSize(args.name, ...args.options);
    });
    ipcMain.on('window_center', (_, args) => {
      this.setCenter(args.name);
    });
    ipcMain.on('window_hideshow', (_, args) => {
      this.setHideShow(args.name, args.show);
    });
  }

  setPosition(name: string, x: number, y: number, animate?: boolean) {
    this.windows[name!]?.setPosition(x < 0 ? screen.getPrimaryDisplay().size.width + x : x, y, animate);
  }

  setSize(name: string, width: number, height: number, animate?: boolean) {
    this.windows[name!]?.setSize(width, height, animate);
  }

  setCenter(name: string) {
    this.windows[name!]?.center();
  }

  setHideShow(name: string, show: boolean) {
    if (show) {
      this.windows[name!]?.show();
      this.windows[name!]?.focus();
    } else {
      this.windows[name!]?.hide();
    }
  }

  async createWindow(
    _role?: any,
    options: BrowserWindowConstructorOptions & {
      url?: string;
      name?: string;
      forbidUpdateTitle?: boolean;
    } = {},
    fromWeb = false,
  ): Promise<BrowserWindow> {
    const name = options.name ?? getTitle();
    const title = options.title ?? getTitle();
    if (this.windows[name]) {
      if (!this.windows[name]?.isVisible()) {
        this.windows[name]?.show();
      }
      if (this.windows[name]?.isMinimized()) {
        this.windows[name]?.restore();
      }
      this.windows[name]?.focus();
      return this.windows[name]!;
    }
    const session = getSession();
    log.info('create main window', { name, title });

    const appEnvName = 'unknown'

    if (options.x && options.x < 0) {
      // eslint-disable-next-line
      options.x = screen.getPrimaryDisplay().size.width + options.x;
    }

    const disableVibrancy = true
    const useCosmo = false

    const window = new BrowserWindow({
      width: useCosmo ? cosmoOriginWidth : minWidth,
      height: useCosmo ? cosmoOriginHeight : minHeight,
      minWidth: useCosmo ? cosmoMinWidth : minWidth,
      minHeight: useCosmo ? cosmoMinHeight : minHeight,
      maxWidth: useCosmo ? cosmoMaxWidth : undefined,
      maxHeight: useCosmo ? cosmoMaxHeight : undefined,
      maximizable: false,
      resizable: useCosmo,
      transparent: !disableVibrancy,
      frame: false,
      visualEffectState: process.platform === 'darwin' && !disableVibrancy ? 'active' : undefined,
      name: `${name}${appEnvName}`,
      show: false,
      center: true,
      ...options,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInSubFrames: true,
        contextIsolation: false,
        webSecurity: false,
        session,
        webviewTag: true,
        ...options.webPreferences,
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    if (!disableVibrancy)
      if (process.platform === 'darwin') {
        window.setVibrancy('light');
      } else {
        window.setBackgroundMaterial('acrylic');
      }

    this.windows[name] = window;

    enableCors(session);
    registerFileProtocol(session);

    if (devTools) {
      window.webContents.openDevTools({
        mode: 'detach',
      });
    }

    if (options.forbidUpdateTitle) {
      window.on('page-title-updated', event => {
        event.preventDefault();
      });
    }

    if (options.url) {
      window.on('closed', () => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.windows[name];
      });
      window.loadURL(options.url);
      return window;
    }

    if (serve) {
      // SSL/TSL: this is the self signed certificate support
      if (!hasCertificateError) {
        app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
          // On certificate error we disable default behaviour (stop loading the page)
          // and we then say "it is all fine - true" to the callback
          event.preventDefault();
          callback(true);
        });
        hasCertificateError = true;
      }

      window.loadURL(`http://127.0.0.1:${process.env.OUTROOM_PORT ?? 6001}`);
    } else {
      window.loadFile(path.join(__dirname, `../renderer/index.html`), {
      });
    }

    ipcMain.once('app-ready', () => {
      setTimeout(() => {
        
      }, 0);
    });

    webRequestMonitor(window);
    // 上报主进程请求
    webRequestMonitor(window, true);

    window.on('closed', () => {
      log.info('main window closed');
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.windows[name];
      if (BrowserWindow.getAllWindows().every(win => !win.isVisible())) {
        app.quit();
      }
    });

    return window;
  }

  getWindow = (name: string): BrowserWindow | undefined => {
    return this.windows[name];
  };

  closeWindow = (names: string[] = []) => {
    names.forEach(name => {
      const window = this.getWindow(name);
      if (window) {
        window.close();
      }
    });
  };
}

export default new WindowManager();
