import { BrowserWindow, Menu, type MenuItemConstructorOptions, app, desktopCapturer, ipcMain } from 'electron';
import windowManager from './windowManager';
import { getSession, getTitle } from './util';
import { WebRequestService } from './services/webRequestService';


app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests');
app.commandLine.appendSwitch('disable-web-security');

let mainWindow: BrowserWindow | null;

app.whenReady().then(async () => {
  mainWindow = await windowManager.createWindow();

  const session = getSession();
  WebRequestService.setupWebRequestHandlers(session);

  app.on('activate', async () => {
    const browserWindows = BrowserWindow.getAllWindows();
    if (browserWindows.length === 0) {
      mainWindow = await windowManager.createWindow();
    } else {
      const mainWindow = windowManager.getWindow(getTitle());
      if (!mainWindow?.isVisible()) {
        mainWindow?.show();
      }
    }
  });
})

ipcMain.on('app-ready', () => {
  if (mainWindow) {
    mainWindow.show();
  }
})