import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';

export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function openBrowser({port=9710,label='performance',noWebGL=false}={}){
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--no-first-run','--no-default-browser-check',...(noWebGL?['--disable-webgl']:['--enable-unsafe-swiftshader','--use-angle=swiftshader']),'--remote-debugging-port='+port,'--user-data-dir='+resolve('../.steelsmart-'+label+'-'+process.pid),'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket,send;
  try{
    let targets;
    for(let i=0;i<100;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`,{signal:AbortSignal.timeout(1000)})).json();break;}catch{await delay(100);}}
    if(!targets)throw new Error('Chrome did not start');
    socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map(),errors=[],events=[];
    socket.onmessage=e=>{const message=JSON.parse(e.data);if(message.id){const call=pending.get(message.id);pending.delete(message.id);message.error?call?.reject(message.error):call?.resolve(message.result);}else{events.push(message);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);}};
    send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(new Error(method+' timeout'));},30000);pending.set(next,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id:next,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    const until=async expression=>{for(let i=0;i<180;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Timed out: '+expression);};
    const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const trustedClick=async selector=>{
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})`);
      const point=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)}),r=element.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!hit||!(hit===element||element.contains(hit)))throw new Error('Control is covered: '+${JSON.stringify(selector)});return {x,y};})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    };
    const set=async(selector,value,type='change')=>evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});field.value=${JSON.stringify(value)};field.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true}));})()`);
    const metrics=(width=1512,height=1000,mobile=false)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    const navigate=async(path,ready)=>{await send('Page.navigate',{url:'http://localhost:4310/'+path});await until('document.documentElement&&('+ready+')');};
    const screenshot=async name=>{const folder=resolve('artifacts/performance');await mkdir(folder,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(folder,name+'.png'),Buffer.from(shot.data,'base64'));};
    await send('Page.enable');await send('Runtime.enable');await metrics();
    return {send,evaluate,until,click,trustedClick,set,metrics,navigate,screenshot,errors,events,async close(){try{await send('Browser.close');}catch{}socket.close();browser.kill();browser.unref();}};
  }catch(error){socket?.close();browser.kill();browser.unref();throw error;}
}
