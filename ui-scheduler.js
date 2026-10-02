// Keep live input responsive while committing only the latest state each frame.
export function createFrameTask(callback,{request=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame}={}){
  let frame=null,pending=null;
  const run=()=>{frame=null;const args=pending;pending=null;if(args)callback(...args);};
  const task=(...args)=>{pending=args;if(frame===null)frame=request(run);};
  task.cancel=()=>{if(frame!==null)cancel(frame);frame=null;pending=null;};
  task.flush=()=>{if(frame!==null)cancel(frame);run();};
  return task;
}
