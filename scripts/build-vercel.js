import {cp,mkdir,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'dist');
const browserExtensions=new Set(['.css','.html','.js','.svg']);

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isFile()||entry.name==='server.js')continue;
  const extension=entry.name.slice(entry.name.lastIndexOf('.'));
  if(browserExtensions.has(extension))await cp(join(root,entry.name),join(output,entry.name));
}
for(const directory of ['assets','vendor'])await cp(join(root,directory),join(output,directory),{recursive:true});
console.log('Prepared static Vercel output in dist/');
