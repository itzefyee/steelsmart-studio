// One gesture owns one pointer, including when other fingers land on the canvas.
export function bindPointerDrag(target,{canStart=()=>true,onStart=()=>{},onMove=()=>{},onEnd=()=>{}},owner=globalThis.window){
  let drag=null;
  const finish=(event,cancelled=false)=>{
    if(!drag||(event.type!=='blur'&&event.pointerId!==drag.id))return;
    const current=drag;drag=null;
    if(target.hasPointerCapture?.(current.id))target.releasePointerCapture(current.id);
    onEnd(event,current.total,cancelled);
  };
  const down=event=>{
    if(drag||event.button!==0||!canStart(event))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,total:0};
    target.setPointerCapture?.(event.pointerId);onStart(event);
  };
  const move=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    drag.total+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;onMove(dx,dy,event);
  };
  const up=event=>finish(event),cancel=event=>finish(event,true),blur=()=>finish({type:'blur'},true);
  const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel};
  for(const [type,handler] of Object.entries(handlers))target.addEventListener(type,handler);
  owner?.addEventListener('blur',blur);
  return ()=>{blur();for(const [type,handler] of Object.entries(handlers))target.removeEventListener(type,handler);owner?.removeEventListener('blur',blur);};
}
