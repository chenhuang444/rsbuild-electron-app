import { Session } from 'electron';
import log from 'electron-log';

export const requestMap: Map<number, Record<string, any>> = new Map();

const urlFilter = {
  urls: [
    'https://www.baidu.com/*',
    'https://*.cretacontent.com/*',
    '*://*.feishu.cn/',
    'file://*/*',
  ],
};

export class WebRequestService {
  private static readonly DEFAULT_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

  static setupWebRequestHandlers(session: Session) {
    this.setupBeforeRequest(session);
    this.setupBeforeSendHeaders(session);
    this.setupSendHeaders(session);
    this.setupHeadersReceived(session);
    this.setupCompleted(session);
    this.setupErrorOccurred(session);
  }

  private static setupBeforeRequest(session: Session) {
    session.webRequest.onBeforeRequest(urlFilter, (details, callback) => {
      const { id, timestamp } = details;
      requestMap.set(id, {
        beforeRequestTime: timestamp,
      });
      callback({});
    });
  }

  private static setupBeforeSendHeaders(session: Session) {
    session.webRequest.onBeforeSendHeaders(urlFilter, (details, callback) => {
      // log.info('[WebRequestService] onBeforeSendHeaders ', {
      //   url: details.url,
      // });
      const { id, timestamp } = details;
      const data = requestMap.get(id);
      if (data) {
        data.beforeSendHeadersTime = timestamp;
      }
      callback(details);
    });
  }

  private static setupSendHeaders(session: Session) {
    session.webRequest.onSendHeaders(urlFilter, details => {
      const { id, timestamp } = details;
      const data = requestMap.get(id);
      if (data) {
        data.sendHeadersTime = timestamp;
      }
    });
  }

  private static setupHeadersReceived(session: Session) {
    session.webRequest.onHeadersReceived(urlFilter, (details, callback) => {
      // log.info('[WebRequestService] onHeadersReceived received');

      // 处理性能监控数据
      const { id, timestamp } = details;
      const data = requestMap.get(id);
      if (data) {
        data.headersReceivedTime = timestamp;
      }

      const newResponseHeaders = this.processResponseHeaders(details.responseHeaders);

      try {
        const setCookieArr = this.getTestCookies(newResponseHeaders);

        if (setCookieArr.length > 0) {
          const maxAge = this.getMaxAge(setCookieArr);
          newResponseHeaders['set-cookie'] = this.processSetCookieHeaders(setCookieArr, maxAge);

          // log.info('[WebRequestService] onHeadersReceived setCookie success');
        }
      } catch (error) {
        log.error('[WebRequestService] onHeadersReceived setCookie error:', error);
      }

      callback({ responseHeaders: newResponseHeaders });
    });
  }

  private static setupCompleted(session: Session) {
    session.webRequest.onCompleted(urlFilter, details => {
      const { id, url, responseHeaders, fromCache, statusCode, timestamp } = details;
      // log.info('[WebRequestService] onCompleted ', {
      //   id,
      //   url,
      //   statusCode,
      // });

      console.log('[WebRequestService] xxx onCompleted 💡: ', statusCode, " - " ,url);

      requestMap.set(id, {
        ...requestMap.get(id),
        id,
        url,
        from_cache: fromCache,
        status_code: statusCode,
        content_type: getHeaderValue(responseHeaders, 'Content-Type'),
        content_size: getHeaderValue(responseHeaders, 'Content-Length'),
        cache_hit: getCacheHit(responseHeaders),
        cdn_provider: getCDNProvider(responseHeaders),
        via_info: getHeaderValue(responseHeaders, 'Via'),
        oss_server_time: getHeaderValue(responseHeaders, 'X-Oss-Server-Time'),
        oss_request_id: getHeaderValue(responseHeaders, 'X-Oss-Request-Id'),
        time_requestStart: getRequestStartTime(id)?.toFixed(3),
        time_responseStart: getResponseStartTime(id)?.toFixed(3),
        time_responseEnd: getResponseEndTime(id, timestamp)?.toFixed(3),
        duration_request: getRequestDurationTime(id)?.toFixed(3),
        duration_response: getResponseDurationTime(id, timestamp)?.toFixed(3),
      });
    });
  }

  private static setupErrorOccurred(session: Session) {
    session.webRequest.onErrorOccurred(urlFilter, details => {
      const { id, url, fromCache, error, timestamp } = details;
      requestMap.set(id, {
        ...requestMap.get(id),
        id,
        url,
        from_cache: fromCache,
        error,
        time_requestStart: getRequestStartTime(id)?.toFixed(3),
        time_responseStart: getResponseStartTime(id)?.toFixed(3),
        time_responseEnd: getResponseEndTime(id, timestamp)?.toFixed(3),
        duration_request: getRequestDurationTime(id)?.toFixed(3),
        duration_response: getResponseDurationTime(id, timestamp)?.toFixed(3),
      });
    });
  }

  private static processResponseHeaders(responseHeaders: Record<string, string[]> | undefined) {
    let newHeaders = { ...(responseHeaders || {}) };
    const excludeHeaders = ['x-frame-options'];

    // 过滤掉 excludeHeaders 中的字段
    newHeaders = Object.fromEntries(
      Object.entries(newHeaders).filter(([key]) => !excludeHeaders.includes(key.toLowerCase())),
    );

    return newHeaders;
  }

  private static getTestCookies(headers: Record<string, string[]>): string[] {
    // 获取所有 set-cookie 相关的 header（不区分大小写）
    const setCookies = Object.entries(headers)
      .filter(([key]) => new RegExp('set-cookie', 'i').test(key))
      .flatMap(([_, values]) => values || []);

    return setCookies.filter(item => true);
  }

  private static getMaxAge(cookies: string[]): number {
    const persistentCookie = cookies.find(item => new RegExp('persistent', 'i').test(item));
    if (persistentCookie) {
      const maxAgeMatch = persistentCookie.match(/Max-Age=(\d+)/i);
      return maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : this.DEFAULT_MAX_AGE;
    }
    return this.DEFAULT_MAX_AGE;
  }

  private static processSetCookieHeaders(cookies: string[], maxAge: number): string[] {
    return cookies.map(originalCookie => {
      const isPersistent =
        new RegExp(/Max-Age=(\d+)/i).test(originalCookie) || new RegExp(/Expires=(\d+)/i).test(originalCookie);
      let newCookie = originalCookie;
      if (!new RegExp('secure', 'i').test(newCookie)) {
        newCookie = `${newCookie}; secure`;
      }
      if (!new RegExp('samesite=none', 'i').test(newCookie)) {
        newCookie = `${newCookie}; samesite=none`;
      }
      if (!isPersistent) {
        newCookie = `${newCookie}; max-age=${maxAge}`;
      }
      return newCookie;
    });
  }
}

type ResponseHeaders = undefined | Record<string, string[]>;

function getHeaderValue(headers: ResponseHeaders, key: string) {
  if (!headers) {
    return undefined;
  }
  const value = headers[key] ?? headers[key.toLocaleLowerCase()];
  return value?.[0] ?? undefined;
}

function getCacheHit(headers: ResponseHeaders) {
  let value = getHeaderValue(headers, 'X-Cache');
  if (value !== undefined) {
    return value === 'HIT' ? 1 : 0;
  }
  value = getHeaderValue(headers, 'X-Cache-Lookup');
  if (value !== undefined) {
    // Hit From MemCache
    // Hit From Disktank
    // Cache Hit
    return value.includes('Hit') ? 1 : 0;
  }

  return 0;
}

function getCDNProvider(headers: ResponseHeaders) {
  if (headers?.eagleid) {
    return 'aliyun';
  }
  if (headers?.['x-nws-log-uuid']) {
    return 'tencent';
  }
  return 'unknown';
}

function getRequestStartTime(id: number) {
  const data = requestMap.get(id);
  if (!data) {
    return undefined;
  }
  return (data.beforeSendHeadersTime ?? 0) - (data.beforeRequestTime ?? 0) || undefined;
}

function getResponseStartTime(id: number) {
  const data = requestMap.get(id);
  if (!data) {
    return undefined;
  }
  return (data.headersReceivedTime ?? 0) - (data.beforeRequestTime ?? 0) || undefined;
}

function getResponseEndTime(id: number, responseEndTime: number) {
  const data = requestMap.get(id);
  if (!data) {
    return undefined;
  }
  return responseEndTime - (data.beforeRequestTime ?? 0) || undefined;
}

function getRequestDurationTime(id: number) {
  const data = requestMap.get(id);
  if (!data) {
    return undefined;
  }
  return (data.headersReceivedTime ?? 0) - (data.beforeSendHeadersTime ?? 0) || undefined;
}

function getResponseDurationTime(id: number, responseEndTime: number) {
  const data = requestMap.get(id);
  if (!data) {
    return undefined;
  }
  return responseEndTime - (data.headersReceivedTime ?? 0) || undefined;
}
