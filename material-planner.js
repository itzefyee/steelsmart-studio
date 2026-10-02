function nonnegative(value,label){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new RangeError(label+' must be a finite, non-negative number.');return value;}

export function planStock(model,{stockLength,kerf}){
  nonnegative(stockLength,'Stock length');nonnegative(kerf,'Saw kerf');if(stockLength===0||stockLength>100||kerf>=stockLength)throw new RangeError('Choose a stock length above zero and a smaller saw kerf.');
  const bars=[],oversize=[],groups=new Map();
  for(const member of model.members){if(!Number.isFinite(member.length)||member.length<=0)throw new RangeError('Member lengths must be positive and finite.');if(member.length>stockLength+1e-9){oversize.push({...member});continue;}if(!groups.has(member.profile))groups.set(member.profile,[]);groups.get(member.profile).push(member);}
  for(const [profile,members] of groups){
    const bins=[];for(const member of [...members].sort((a,b)=>b.length-a.length||a.id.localeCompare(b.id))){
      let bar=bins.find(b=>b.usedLength+b.kerfLength+(b.cuts.length?kerf:0)+member.length<=stockLength+1e-9);
      if(!bar){bar={id:'S'+String(bars.length+1).padStart(3,'0'),profile,stockLength,cuts:[],usedLength:0,kerfLength:0,wasteLength:stockLength};bins.push(bar);bars.push(bar);}
      const saw=bar.cuts.length?kerf:0,start=bar.usedLength+bar.kerfLength+saw;
      bar.cuts.push({id:member.id,kind:member.kind,profile,length:member.length,start,end:start+member.length});bar.usedLength+=member.length;bar.kerfLength+=saw;bar.wasteLength=Math.max(0,stockLength-bar.usedLength-bar.kerfLength);
    }
  }
  const purchased=bars.length*stockLength,usedLength=bars.reduce((s,b)=>s+b.usedLength,0),kerfLength=bars.reduce((s,b)=>s+b.kerfLength,0),wasteLength=bars.reduce((s,b)=>s+b.wasteLength,0);
  return {bars,oversize,stockSize:stockLength,stockLength:purchased,usedLength,kerfLength,wasteLength,utilization:purchased?usedLength/purchased:0,allocatedMembers:bars.reduce((s,b)=>s+b.cuts.length,0),totalMembers:model.members.length};
}

export function materialScenario(model,{rate,carbonFactor}){nonnegative(rate,'Material rate');nonnegative(carbonFactor,'Carbon factor');nonnegative(model.mass,'Member mass');return {cost:model.mass*rate,carbon:model.mass*carbonFactor};}

export function stockCSV(plan){
  const rows=[['Stock ID','Profile','Stock length (m)','Member','Cut length (m)','Start (m)','End (m)','Status']];
  for(const bar of plan.bars)for(const cut of bar.cuts)rows.push([bar.id,bar.profile,bar.stockLength,cut.id,cut.length.toFixed(6),cut.start.toFixed(6),cut.end.toFixed(6),'ALLOCATED']);
  for(const member of plan.oversize)rows.push(['',member.profile,plan.stockSize,member.id,member.length.toFixed(6),'','','OVERSIZE']);
  return '# SteelSmart concept stock layout; inter-cut kerf only; oversize members require separate planning\n'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n');
}
