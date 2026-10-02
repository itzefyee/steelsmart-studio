import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {spawn} from 'node:child_process';
import {createServer as createNetServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {createAppServer} from '../../server.js';

const root=resolve('artifacts/performance/server-fixtures'),source='export const sections='+JSON.stringify(Array.from({length:300},(_,i)=>({id:i,profile:'HEA 240',length:6})))+';';
let server,port;
test.before(async()=>{await mkdir(root,{recursive:true});await writeFile(resolve(root,'index.html'),'<h1>Studio</h1>');await writeFile(resolve(root,'model.js'),source);await writeFile(resolve(root,'changing.css'),'body { color: navy; }');server=createAppServer({root,maxCacheEntries:2});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;});
test.after(()=>new Promise(resolve=>server.close(resolve)));
function get(path,headers={},method='GET'){return new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path,method,headers},res=>{const parts=[];res.on('data',part=>parts.push(part));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));});req.on('error',reject);req.end();});}
test('negotiated compression preserves bytes and substantially reduces delivery',async()=>{
  for(const [encoding,decode] of [['br',brotliDecompressSync],['gzip',gunzipSync]]){const response=await get('/model.js',{'Accept-Encoding':encoding});assert.equal(response.status,200);assert.equal(response.headers['content-encoding'],encoding);assert.equal(decode(response.body).toString(),source);assert.ok(response.body.length<source.length/2);assert.equal(Number(response.headers['content-length']),response.body.length);assert.equal(response.headers.vary,'Accept-Encoding');}
});
test('conditional GET and HEAD preserve representation metadata without a body',async()=>{
  const first=await get('/model.js',{'Accept-Encoding':'br'}),cached=await get('/model.js',{'Accept-Encoding':'br','If-None-Match':first.headers.etag});assert.equal(cached.status,304);assert.equal(cached.body.length,0);
  const head=await get('/model.js',{'Accept-Encoding':'br'},'HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(head.headers['content-length'],first.headers['content-length']);assert.equal(head.headers.etag,first.headers.etag);
});
test('encoding exclusions and representation-specific ETags are respected',async()=>{
  const plain=await get('/model.js',{'Accept-Encoding':'br;q=0,gzip;q=0'});assert.equal(plain.headers['content-encoding'],undefined);assert.equal(plain.body.toString(),source);
  const compressed=await get('/model.js',{'Accept-Encoding':'gzip','If-None-Match':plain.headers.etag});assert.equal(compressed.status,200);assert.notEqual(compressed.headers.etag,plain.headers.etag);
  assert.equal((await get('/model.js',{'Accept-Encoding':'*;q=0,identity;q=0'})).status,406);
});
test('cached files are refreshed after edits',async()=>{
  const first=await get('/changing.css');await writeFile(resolve(root,'changing.css'),'body { color: orange; background: white; }');const changed=await get('/changing.css',{'If-None-Match':first.headers.etag});assert.equal(changed.status,200);assert.match(changed.body.toString(),/orange/);assert.notEqual(first.headers.etag,changed.headers.etag);
});
test('safe routing rejects traversal, docs, malformed URLs and unsupported methods',async()=>{
  assert.equal((await get('/')).status,200);for(const path of ['/../package.json','/%2e%2e%5capp.js','/docs/private.js','/.hidden.js','/missing.js'])assert.equal((await get(path)).status,404,path);
  assert.equal((await get('/%ZZ')).status,400);assert.equal((await get('/model.js',{},'POST')).status,405);
});
test('Render startup binds publicly without a HOST override',async()=>{
  const probe=createNetServer();
  await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const renderPort=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const {HOST,...env}=process.env;
  const child=spawn(process.execPath,['server.js'],{cwd:resolve('.'),env:{...env,RENDER:'true',PORT:String(renderPort)},stdio:['ignore','pipe','pipe']});
  let output='';
  try{
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Render startup timed out: '+output)),10000);
      child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('listening on 0.0.0.0:'+renderPort)){clearTimeout(timeout);resolve();}});
      child.stderr.on('data',chunk=>{output+=chunk;});
      child.once('error',error=>{clearTimeout(timeout);reject(error);});
      child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Render startup exited '+code+': '+output));});
    });
    const response=await fetch('http://127.0.0.1:'+renderPort+'/');
    assert.equal(response.status,200);
    assert.match(await response.text(),/SteelSmart/);
  }finally{
    child.kill();
    if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));
  }
});
