import { CSSProperties, forwardRef } from 'react';

interface Props {
  src: string;

  partition?: string;

  className?: string;

  style?: CSSProperties;
}
// 除了sandbox=no, 还需要contextIsolation=false, fix: 虽然preload可以require sdk, 但是引入的全局对象会在webview里移除
export const Webview = forwardRef<HTMLWebViewElement, Props>(
  ({ src, partition = 'persist:teacher', className, style }, ref) => {
    console.log('xxx webview partition: ', partition);
    return (
      <webview
        ref={ref}
        className={className}
        style={style}
        partition={partition}
        src={src}
        webpreferences="backgroundThrottling=no,webSecurity=no,allowRunningInsecureContent=yes,contextIsolation=false
          ,sandbox=no"
      />
    );
  },
);
