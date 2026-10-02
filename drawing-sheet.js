const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const number=(n,d=2)=>Number(n.toFixed(d)).toLocaleString('en-US');

export function projectedViews(model){
  return [['FRONT ELEVATION',0,1],['SIDE ELEVATION',2,1],['PLAN VIEW',0,2]].map(([name,x,y])=>{
    const segments=model.members.map(m=>({id:m.id,kind:m.kind,a:[m.a[x],m.a[y]],b:[m.b[x],m.b[y]]})),points=segments.flatMap(s=>[s.a,s.b]),min=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],max=[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
    return {name,segments,min,max,width:max[0]-min[0],height:max[1]-min[1]};
  });
}

export function drawingSheet(model){
  const text=(x,y,value,size=15,extra='')=>`<text x="${x}" y="${y}" class="ss-text" font-size="${size}" ${extra}>${xml(value)}</text>`;
  const panels=[[48,150,635,325],[717,150,635,325],[48,515,855,365]],views=projectedViews(model);
  const viewMarkup=views.map((view,index)=>{
    const [x,y,w,h]=panels[index],scale=Math.min((w-112)/Math.max(view.width,.1),(h-105)/Math.max(view.height,.1)),ox=x+(w-view.width*scale)/2,oy=y+55+(h-110-view.height*scale)/2;
    const point=p=>[ox+(p[0]-view.min[0])*scale,oy+(view.max[1]-p[1])*scale];
    const lines=view.segments.map(segment=>{const a=point(segment.a),b=point(segment.b);return `<line data-member="${xml(segment.id)}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${segment.kind==='brace'?'#8797a9':'#334e70'}" stroke-width="${segment.kind==='brace'?1:1.8}" ${segment.kind==='brace'?'stroke-dasharray="4 3"':''}/>`;}).join('');
    const left=ox,right=ox+view.width*scale,bottom=oy+view.height*scale,dimY=bottom+24;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#d7dfe7"/>${text(x+20,y+28,view.name,13,'letter-spacing="1.4"')}${lines}<path d="M${left} ${bottom+8}V${dimY+7}M${right} ${bottom+8}V${dimY+7}M${left} ${dimY}H${right}" stroke="#7c8da1" fill="none"/>${text((left+right)/2,dimY+22,number(view.width)+' m',13,'text-anchor="middle"')}<text class="ss-text" x="${right+23}" y="${oy+view.height*scale/2}" font-size="12" transform="rotate(-90 ${right+23} ${oy+view.height*scale/2})" text-anchor="middle">${number(view.height)} m</text>`;
  }).join('');
  const rows=[['Template',{portal:'Portal frame',canopy:'Open canopy',rack:'Storage rack'}[model.params.template]],['Eave height',number(model.params.height)+' m'],['Bays',model.params.bays],['Footprint',number(model.area)+' m²'],['Steel grade',model.params.material],['Members',model.members.length],['Nominal mass',number(model.mass,0)+' kg']];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="980" viewBox="0 0 1400 980" role="img" aria-label="SteelSmart concept drawing sheet"><style>.ss-text{font-family:Arial,sans-serif;fill:#33475d}.ss-title{font-family:Arial,sans-serif;fill:#24374e}</style><rect width="1400" height="980" fill="#f8fafb"/>${text(48,62,'SteelSmart / Concept drawing',28)}${text(48,104,model.params.name.slice(0,75),19)}${text(1352,62,'SS / 001',17,'text-anchor="end"')}${text(1352,99,'METRES · MODEL CENTERLINES',12,'text-anchor="end" letter-spacing="1"')}${viewMarkup}<rect x="937" y="515" width="415" height="365" fill="#f0f4f7" stroke="#d7dfe7"/>${text(960,552,'MODEL SCHEDULE',13,'letter-spacing="1.4"')}${rows.map(([label,value],i)=>`${text(960,589+i*34,label,14)}${text(1330,589+i*34,value,14,'text-anchor="end"')}`).join('')}<path d="M48 914H1352" stroke="#bfcbd7"/>${text(48,944,'CONCEPT CENTERLINES / Not a fabrication drawing. Engineering validation required.',13)}${text(1352,944,'1 / 1',13,'text-anchor="end"')}</svg>`;
}
