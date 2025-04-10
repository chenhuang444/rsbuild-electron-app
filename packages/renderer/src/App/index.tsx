import { useEffect, useState } from "react";
import { Webview } from "./Webview";
import { type WebviewTag } from "electron";

export function App() {
  const [webviewEle, setWebview] = useState<WebviewTag | null>(null)

  useEffect(() => {
    if (!webviewEle) return
    const webviewTag = webviewEle;
    function onDomReady() {
      webviewTag.openDevTools();
    }
    webviewTag.addEventListener('dom-ready', onDomReady);
    return () => {
      webviewTag.removeEventListener('dom-ready', onDomReady);
    }
  }, [webviewEle])

  return (
    <>
      <Webview
        ref={(r) => {
          setWebview(r as WebviewTag)
        }}
        // src={`${webappUrl}?${queryParams}`}
        src="https://www.baidu.com"
        style={{ width: "100%", height: "100%", position: 'absolute', top: 0, left: 0 }}
        partition="persist:teacher"
      />
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 99999999, cursor: 'pointer' }}>
        <div onClick={() => {
          webviewEle?.closeDevTools()
        }}>close Devtool</div>
        <div onClick={() => {
          webviewEle?.openDevTools()
        }}>open Devtool</div>
      </div>
    </>
  );
}
