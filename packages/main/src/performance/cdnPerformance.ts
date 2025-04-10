import { BrowserWindow, app } from 'electron';
import { requestMap } from '../services/webRequestService';

const sendFinishRequest = (win: BrowserWindow) => {
  // Electron 的 BrowserWindow 实例在关闭或销毁后，其 webContents 属性对象将变为不可用状态
  if (!win?.isDestroyed()) {
    const requestsFinish: any[] = [];
    requestMap.forEach(url => {
      if (url.time_responseEnd) {
        requestsFinish.push(url);
        requestMap.delete(url.id);
      }
    });

    if (requestsFinish.length) {
      // win有可能被销毁
      win?.webContents?.send('web-request-monitor', {
        requests: requestsFinish,
      });
    }
  }
};

export function webRequestMonitor(win: BrowserWindow, isUpgrade = false) {
  let requestSession = win.webContents.session;

  !isUpgrade &&
    setInterval(() => {
      sendFinishRequest(win);
    }, 15000);

  app.addListener('before-quit', () => {
    sendFinishRequest(win);
  });
}
