import { session, screen, app } from 'electron';
import { exec } from 'child_process';
import * as log from 'electron-log';

// 判断是否是M芯片
let isAppleCpu: boolean | undefined;

export const minWidth = 1113;
export const minHeight = 720;

// win 统一比 mac 高 32px;
const isMac = process.platform === 'darwin';
export const cosmoMinWidth = 1122;
export const cosmoMinHeight = isMac ? 694 : 726;
export const cosmoOriginWidth = 1176;
export const cosmoOriginHeight = isMac ? 754 : 786;
export const cosmoMaxWidth = 1728;
export const cosmoMaxHeight = isMac ? 1117 : 1149;

export const isDarwin = process.platform === 'darwin';
export const isOSx64 = () => process.arch.includes('64') || !!process.env.PROCESSOR_ARCHITEW6432;

const teacherPartition = 'persist:teacher';
const studentPartition = 'persist:student';
const consultantPartition = 'persist:consultant';

export const getSession = () => {
  return session.fromPartition(teacherPartition);
};

export const getTitle = () => {
  return "Test Electron App"
};

export const getQueryParam = (str: string) => {
  const params = str.split('&');
  const obj: { [key: string]: string } = {};
  params.forEach(param => {
    const [key, value] = param.split('=') as [string, string];
    obj[key] = value;
  });
  return obj;
};

export function isAppleCpuPromise(): Promise<boolean> {
  return new Promise(res => {
    if (isAppleCpu !== undefined) {
      res(isAppleCpu);
    } else {
      exec('sysctl -n machdep.cpu.brand_string', (err, out) => {
        if (err) {
          isAppleCpu = false;
        } else if (out.toLocaleLowerCase().includes('apple')) {
          isAppleCpu = true;
        } else {
          isAppleCpu = false;
        }
        res(isAppleCpu);
      });
    }
  });
}

let cachedArchResult: 'arm64' | 'x64' | 'ia32' | undefined;

export async function getArch() {
  if (cachedArchResult) return cachedArchResult;
  if (isDarwin) {
    try {
      const isArm64 = await isAppleCpuPromise();
      cachedArchResult = isArm64 ? 'arm64' : 'x64';
      return cachedArchResult;
    } catch (e) {
      log.error('[getArch] isAppleCpuPromise called error,', e);
      return 'x64';
    }
  } else {
    cachedArchResult = isOSx64() ? 'x64' : 'ia32';
    return cachedArchResult;
  }
}

// 设置cookie的安全策略，使得renderer请求可以带上webapp的cookies
export async function setCookiesSameSite() {
  try {
    const persistSession = getSession();
    const cookies = await persistSession.cookies.get({});
    const myCookies = cookies.filter(item => true);

    await Promise.all(
      myCookies
        .filter(cookie => !(cookie.sameSite === 'no_restriction' && cookie.secure && !cookie.session))
        .map(cookie => {
          const newCookie: Electron.CookiesSetDetails = {
            url: `https://${cookie.domain!.startsWith('.') ? cookie.domain!.substring(1) : cookie.domain!}${
              cookie.path ?? ''
            }`,
            ...cookie,
            secure: true, // sameSite必须配合secure
            sameSite: 'no_restriction',
          };

          return persistSession.cookies.set(newCookie);
        }),
    );
    log.info(`[cookies] set secure and sameSite successfully`);
  } catch (e) {
    log.error('[cookies] set secure and sameSite error', e);
  }
}
