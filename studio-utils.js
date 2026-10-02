export const byId=id=>document.getElementById(id);
export const format=(n,d=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
export const downloadFile=(content,name,type)=>{const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
