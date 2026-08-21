const BRIDGE = `<script>
(()=>{let n=0,frame=0;const pending=new Map();window.dshWidget={fetch(url){return new Promise((resolve,reject)=>{const requestId=String(++n);pending.set(requestId,{resolve,reject});parent.postMessage({dshWidget:1,kind:'request',requestId,method:'fetch',url},'*')})}};addEventListener('message',event=>{const m=event.data;if(!m||m.dshWidget!==1||m.kind!=='response')return;const p=pending.get(m.requestId);if(!p)return;pending.delete(m.requestId);m.ok?p.resolve(m.value):p.reject(new Error(m.error))});function measure(){const root=document.documentElement,body=document.body;if(!body)return;const width=Math.max(root.scrollWidth,body.scrollWidth),height=Math.max(root.scrollHeight,body.scrollHeight);parent.postMessage({dshWidget:1,kind:'layout',overflow:width>root.clientWidth+1||height>root.clientHeight+1,width,height,viewportWidth:root.clientWidth,viewportHeight:root.clientHeight},'*')}function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}addEventListener('load',()=>{measure();if(typeof ResizeObserver!=='undefined')new ResizeObserver(schedule).observe(document.documentElement);new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true})})})();
</script>`

const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\';">'
const CANVAS_RESET = '<style data-dsh-widget-canvas>html,body{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;margin:0;overflow:hidden}body{position:relative}</style>'

/**
 * Inject the fixed-canvas reset, security policy, and Host bridge.
 * @param html - validated self-contained Widget entry document.
 * @returns document rendered inside the sandboxed fixed-ratio frame.
 */
export function instrumentWidgetHtml(html: string): string {
  const injection = `${CSP}${CANVAS_RESET}${BRIDGE}`
  return /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${injection}`)
    : `${injection}${html}`
}
