import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {gzip,brotliCompress,constants} from 'node:zlib';

const compress={gzip:promisify(gzip),br:data=>promisify(brotliCompress)(data,{params:{[constants.BROTLI_PARAM_QUALITY]:4}})};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
function encodingFor(header){
  if(!header)return 'identity';
  const preferences=new Map(header.toLowerCase().split(',').map(part=>{const [name,...params]=part.trim().split(';'),weight=params.find(value=>value.trim().startsWith('q=')),q=weight?Number(weight.trim().slice(2)):1;return [name.trim(),Number.isFinite(q)&&q>=0&&q<=1?q:0];}));
  const quality=name=>preferences.get(name)??(name==='identity'?(preferences.get('*')===0?0:1):preferences.get('*')??0);
  return ['br','gzip','identity'].map(name=>({name,q:quality(name)})).filter(item=>item.q>0).sort((a,b)=>b.q-a.q)[0]?.name;
}
export function createAppServer({root=resolve(import.meta.dirname),maxCacheEntries=64}={}){
  root=resolve(root);const cache=new Map();
  return createServer(async(req,res)=>{
    const fail=(status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff',...(status===405?{Allow:'GET, HEAD'}:{})});res.end(req.method==='HEAD'?undefined:text);};
    if(!['GET','HEAD'].includes(req.method))return fail(405,'Method not allowed');
    let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return fail(400,'Invalid URL');}
    const file=resolve(root,'.'+(path==='/'?'/index.html':path)),type=mime[extname(file)];
    if(!file.startsWith(root+sep)||!type||path.split(/[\\/]/).some(part=>part==='docs'||part.startsWith('.')))return fail(404,'Not found');
    try{
      const info=await stat(file);if(!info.isFile())return fail(404,'Not found');
      const encoding=encodingFor(req.headers['accept-encoding']);if(!encoding)return fail(406,'No supported content encoding');
      let entry=cache.get(file);
      if(!entry||entry.size!==info.size||entry.modified!==info.mtimeMs){entry={size:info.size,modified:info.mtimeMs,raw:await readFile(file),encoded:new Map()};}
      // Bounded LRU; a stat on each request makes edits visible immediately.
      cache.delete(file);cache.set(file,entry);while(cache.size>Math.max(1,maxCacheEntries))cache.delete(cache.keys().next().value);
      const etag='"'+info.size.toString(16)+'-'+info.mtimeMs.toString(16)+'-'+encoding+'"';
      const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'public, no-cache',Vary:'Accept-Encoding',ETag:etag,...(encoding==='identity'?{}:{'Content-Encoding':encoding})};
      const matches=req.headers['if-none-match']?.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag);
      if(matches){res.writeHead(304,headers);return res.end();}
      if(encoding!=='identity'&&!entry.encoded.has(encoding))entry.encoded.set(encoding,compress[encoding](entry.raw));
      const data=encoding==='identity'?entry.raw:await entry.encoded.get(encoding);
      res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){fail(error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,error.code==='ENOENT'||error.code==='ENOTDIR'?'Not found':'Unable to load this file');}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT)||4310;createAppServer().listen(port,'127.0.0.1',()=>console.log('SteelSmart Studio: http://localhost:'+port));
}
