import {DEFAULTS} from './model.js';
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
export const smooth=(a,b,n)=>{const x=clamp((n-a)/(b-a));return x*x*(3-2*x);};
export function storyState(value){const p=clamp(value);return {progress:p,chapter:p<.3?0:p<.71?1:2,explosion:smooth(.18,.48,p)*(1-smooth(.63,.78,p)),structure:smooth(.65,.86,p),rotation:-.32+p*.75};}
export function projectConfig(type){return {portal:{...DEFAULTS},canopy:{...DEFAULTS,template:'canopy',name:'Open steel canopy',width:12,length:18,height:4,bays:3},rack:{...DEFAULTS,template:'rack',name:'Industrial storage rack',width:6,length:12,height:6,bays:3}}[type]||{...DEFAULTS};}
