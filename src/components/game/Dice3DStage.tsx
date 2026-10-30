import { useEffect, useRef } from 'react';

/** Geometria tridimensional (vértices + faces) renderizada por projeção em Canvas.
 * Sem bibliotecas externas: funciona também em dispositivos sem WebGL.
 * A física visual não decide resultados; os resultados chegam do sorteio validado na mesa.
 */
export type Dice3DRoll = { id: string; dice: { sides: number; value: number }[] };
type V3 = [number, number, number];
type Face = { ids: number[]; normal: V3; center: V3 };
type Solid = { vertices: V3[]; faces: Face[] };
type Q = [number, number, number, number];
const W = 420, H = 240;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dot = (a: V3, b: V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const add = (a: V3, b: V3): V3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub = (a: V3, b: V3): V3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul = (v: V3, n: number): V3 => [v[0]*n,v[1]*n,v[2]*n];
const cross = (a: V3,b: V3): V3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = (v: V3): V3 => {const n=Math.hypot(...v)||1;return [v[0]/n,v[1]/n,v[2]/n]};
const qNorm=(q:Q):Q=>{const n=Math.hypot(...q)||1;return [q[0]/n,q[1]/n,q[2]/n,q[3]/n]};
const qMul=(a:Q,b:Q):Q=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const axisQ=(axis:V3,ang:number):Q=>{const v=norm(axis),s=Math.sin(ang/2);return [v[0]*s,v[1]*s,v[2]*s,Math.cos(ang/2)]};
const rot=(v:V3,q:Q):V3=>{const t=mul(cross([q[0],q[1],q[2]],v),2);return add(v,add(mul(t,q[3]),cross([q[0],q[1],q[2]],t)))};
function between(a:V3,b:V3):Q{const x=norm(a),y=norm(b),d=clamp(dot(x,y),-1,1);if(d < -.9999)return axisQ(Math.abs(x[0])<.8?[1,0,0]:[0,1,0],Math.PI);const c=cross(x,y);return qNorm([c[0],c[1],c[2],1+d]);}
function slerp(a:Q,b:Q,t:number):Q{let bb=b,cos=a.reduce((v,x,i)=>v+x*b[i]!,0);if(cos<0){bb=[-b[0],-b[1],-b[2],-b[3]];cos=-cos;}if(cos>.9995)return qNorm(a.map((x,i)=>x+(bb[i]!-x)*t) as Q);const th=Math.acos(clamp(cos,-1,1)),sn=Math.sin(th);return qNorm(a.map((x,i)=>(x*Math.sin((1-t)*th)+bb[i]!*Math.sin(t*th))/sn) as Q);}
function hash(s:string){let v=2166136261;for(let i=0;i<s.length;i++)v=Math.imul(v^s.charCodeAt(i),16777619);return v>>>0}
function rnd(seed:number){let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let x=a;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296}}
function makeSolid(vertices:V3[], polyFaces:number[][]):Solid{
  const vv=vertices.map(norm);
  const faces=polyFaces.map(ids=>{
    const center=mul(ids.map(i=>vv[i]!).reduce(add,[0,0,0] as V3),1/ids.length);
    let normal=norm(cross(sub(vv[ids[1]!]!,vv[ids[0]!]!),sub(vv[ids[2]!]!,vv[ids[0]!]!)));
    if(dot(normal,center)<0)normal=mul(normal,-1);
    return {ids,normal,center};
  });
  return {vertices:vv,faces};
}
function hullFaces(vertices:V3[]):number[][]{
  const groups=new Map<string,{normal:V3, ids:Set<number>}>();
  for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
    let n=norm(cross(sub(vertices[j]!,vertices[i]!),sub(vertices[k]!,vertices[i]!)));
    if(Math.hypot(...cross(sub(vertices[j]!,vertices[i]!),sub(vertices[k]!,vertices[i]!)))<1e-5)continue;
    const d=dot(n,vertices[i]!); let lo=false,hi=false;
    for(let t=0;t<vertices.length;t++){const v=dot(n,vertices[t]!)-d;if(v>1e-4)hi=true;if(v< -1e-4)lo=true;}
    if(lo&&hi)continue;
    if(hi)n=mul(n,-1);
    const dist=dot(n,vertices[i]!);
    const key=[...n,dist].map(v=>Math.round(v*1000)).join(',');
    if(groups.has(key))continue;
    const ids=new Set<number>();
    vertices.forEach((v,index)=>{if(Math.abs(dot(n,v)-dist)<.001)ids.add(index)});
    groups.set(key,{normal:n,ids});
  }
  return [...groups.values()].map(g=>{
    const ids=[...g.ids];const c=mul(ids.map(i=>vertices[i]!).reduce(add,[0,0,0] as V3),1/ids.length);
    const u=norm(sub(vertices[ids[0]!]!,c)),v=cross(g.normal,u);
    return ids.sort((a,b)=>Math.atan2(dot(sub(vertices[a]!,c),v),dot(sub(vertices[a]!,c),u))-Math.atan2(dot(sub(vertices[b]!,c),v),dot(sub(vertices[b]!,c),u)));
  }).sort((a,b)=>a[0]!-b[0]!);
}
const phi=(1+Math.sqrt(5))/2;
const icoVerts:V3[]=[];
for(const a of [-1,1])for(const b of [-1,1])icoVerts.push([0,a,b*phi],[a,b*phi,0],[a*phi,0,b]);
const ico=makeSolid(icoVerts,hullFaces(icoVerts));
const dualVerts:V3[]=ico.faces.map(f=>norm(f.center));
const dualFaces:number[][]=ico.vertices.map((v,i)=>{
  const ids=ico.faces.map((f,j)=>f.ids.includes(i)?j:-1).filter(x=>x>=0);
  const normal=norm(v),center=mul(ids.map(j=>dualVerts[j]!).reduce(add,[0,0,0] as V3),1/ids.length);
  const u=norm(sub(dualVerts[ids[0]!]!,center)),tangent=cross(normal,u);
  return ids.sort((a,b)=>Math.atan2(dot(sub(dualVerts[a]!,center),tangent),dot(sub(dualVerts[a]!,center),u))-Math.atan2(dot(sub(dualVerts[b]!,center),tangent),dot(sub(dualVerts[b]!,center),u)));
});
const solids:Record<number,Solid>={
  4:makeSolid([[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],[[0,1,2],[0,3,1],[0,2,3],[1,3,2]]),
  6:makeSolid([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]),
  8:makeSolid([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]]),
  10:(()=>{const v:V3[]=[[0,0,1.55],[0,0,-1.55]];for(let i=0;i<10;i++){const a=i*Math.PI/5;v.push([Math.cos(a),Math.sin(a),i%2===0?-.25:.25]);}const f:number[][]=[];for(let i=0;i<5;i++){f.push([0,2+((2*i)%10),2+((2*i+1)%10),2+((2*i+2)%10)]);f.push([1,2+((2*i+1)%10),2+((2*i+2)%10),2+((2*i+3)%10)]);}return makeSolid(v,f);})(),
  12:makeSolid(dualVerts,dualFaces),
  20:ico,
};
const colors:Record<number,string>={4:'#3db89a',6:'#bea9eb',8:'#d8ba56',10:'#e08fb0',12:'#7fb2e5',20:'#ede1b9'};
function rgb(hex:string):[number,number,number]{return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as [number,number,number]}
function colorOf(hex:string,light:number){const c=rgb(hex);return `rgb(${c.map(x=>Math.round(clamp(x*light,0,255))).join(',')})`}
type Body={x:number,y:number,tx:number,ty:number,vx:number,vy:number,rx:number,ry:number,rz:number,q:Q,target:Q,r:number,side:number,value:number,start:number,duration:number,settled:boolean};
type Props={roll:Dice3DRoll|null;tint:string|null;onSettled:(id:string)=>void};
export function Dice3DStage({roll,tint,onSettled}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const settledRef=useRef(onSettled);settledRef.current=onSettled;
 const tintRef=useRef(tint);tintRef.current=tint;
 useEffect(()=>{
  const canvas=canvasRef.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const data=roll?.dice??[];const random=rnd(hash(roll?.id??'herdeiros-dados'));
  const n=data.length;const radius=clamp(32-n*.55,12,29);
  const columns=Math.max(1,Math.ceil(Math.sqrt(n*(W/H))));const rows=Math.max(1,Math.ceil(n/columns));
  const bodies:Body[]=data.map((d,i)=>{
    const shape=solids[d.sides]??solids[20]!;
    const normal=shape.faces[(d.value-1)%shape.faces.length]!.normal;
    const aim=qMul(axisQ([0,0,1],random()*Math.PI*2),between(normal,[0,0,1]));
    const column=i%columns,row=Math.floor(i/columns),cellW=W/columns,cellH=(H-32)/rows;
    const tx=clamp(cellW*(column+.5)+(random()-.5)*Math.min(12,cellW*.12),radius,W-radius);
    const ty=clamp(8+cellH*(row+.5)+(random()-.5)*Math.min(12,cellH*.12),radius,H-radius);
    return {x:radius+random()*(W-2*radius),y:-radius-random()*90,tx,ty,vx:(random()-.5)*260,vy:100+random()*180,rx:random()*Math.PI*2,ry:random()*Math.PI*2,rz:random()*Math.PI*2,q:axisQ([0,0,1],random()*Math.PI*2),target:aim,r:radius,side:d.sides,value:d.value,start:performance.now(),duration:1750+Math.min(700,i*54),settled:false};
  });
  let raf=0,first=performance.now(),last=first,notified=false;
  const draw=(now:number)=>{
    const dt=Math.min(.04,(now-last)/1000);last=now;
    ctx.clearRect(0,0,W,H);
    const floor=ctx.createLinearGradient(0,0,0,H);floor.addColorStop(0,'#171522');floor.addColorStop(.7,'#252033');floor.addColorStop(1,'#0a0b12');ctx.fillStyle=floor;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#b79b6430';ctx.lineWidth=1;for(let j=0;j<10;j++){ctx.beginPath();ctx.moveTo(0,H*.5+j*j*2);ctx.lineTo(W,H*.5+j*j*2);ctx.stroke()}
    const light=norm([-0.45,-.65,1.3]);
    for(const b of bodies){
      const progress=clamp((now-b.start)/b.duration,0,1);
      if(progress<1){
        b.vy+=1150*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(b.x<b.r||b.x>W-b.r){b.x=clamp(b.x,b.r,W-b.r);b.vx*=-.7}
        if(b.y>H-36-b.r){b.y=H-36-b.r;b.vy=-Math.abs(b.vy)*.55;b.vx*=.83}
        const wobble=qMul(qMul(axisQ([1,.4,.1],progress*20+b.rx),axisQ([.2,1,.8],progress*25+b.ry)),axisQ([0,0,1],progress*12+b.rz));
        const align=clamp((progress-.56)/.44,0,1),ease=align*align*(3-2*align);
        b.q=slerp(wobble,b.target,ease);
        if(align>0){b.x=b.x*(1-ease)+b.tx*ease;b.y=b.y*(1-ease)+b.ty*ease;}
      }else{b.x=b.tx;b.y=b.ty;b.q=b.target;b.settled=true;}
    }
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i]!,b=bodies[j]!;const dx=b.x-a.x,dy=b.y-a.y,ds=Math.hypot(dx,dy)||1,overlap=(a.r+b.r)*.85-ds;
      if(overlap>0 && !(a.settled && b.settled)){const ux=dx/ds,uy=dy/ds;a.x-=ux*overlap*.5;b.x+=ux*overlap*.5;a.y-=uy*overlap*.35;b.y+=uy*overlap*.35;const va=a.vx;a.vx=b.vx*.64;b.vx=va*.64;}
    }
    for(const b of bodies){
      ctx.save();ctx.fillStyle='#000a';ctx.filter='blur(8px)';ctx.beginPath();ctx.ellipse(b.x,H-29,b.r*1.06,b.r*.24,0,0,Math.PI*2);ctx.fill();ctx.restore();
      const solid=solids[b.side]??solids[20]!;
      const positions=solid.vertices.map(v=>rot(v,b.q));
      const project=(v:V3):[number,number]=>{const perspective=3.3/(3.3-v[2]);return [b.x+v[0]*b.r*perspective,b.y+v[1]*b.r*perspective]};
      const faces=solid.faces.map((face,i)=>({face,i,normal:rot(face.normal,b.q),center:rot(face.center,b.q)})).filter(f=>f.normal[2]>.01).sort((a,b)=>a.center[2]-b.center[2]);
      const c=tintRef.current??colors[b.side]??'#d8bb8a';
      for(const {face,i,normal,center} of faces){
        const pts=face.ids.map(id=>project(positions[id]!));
        if(pts.length<3)continue;
        ctx.save();ctx.beginPath();pts.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
        const illumination=clamp(.23+.62*Math.max(0,dot(normal,light))+.13*normal[2],.15,1);
        ctx.fillStyle=colorOf(c,illumination*.68);ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle=colorOf(c,Math.min(1.1,illumination*1.1));ctx.stroke();
        const label=i+1;
        if(normal[2]>.35){
          const [tx,ty]=project(center);const size=b.r*clamp(normal[2],.45,1)*(.67+(label>9?-.08:0));
          ctx.fillStyle='#fff4d9';ctx.shadowColor='#0a0711';ctx.shadowBlur=3;ctx.font=`700 ${Math.max(8,Math.floor(size))}px Georgia,serif`;
          ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(label),tx,ty);
        }
        ctx.restore();
      }
    }
    if(!bodies.length){ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e4ca87';ctx.font='600 15px sans-serif';ctx.fillText('Selecione dados e lance na mesa',W/2,H/2)}
    if(roll && bodies.every(b=>b.settled) && !notified){notified=true;settledRef.current(roll.id)}
    if(now-first<4000 && roll)raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);
  return ()=>cancelAnimationFrame(raf);
 },[roll]);
 return <div className="tdice-3d-wrap"><canvas ref={canvasRef} width={W} height={H} className="tdice-3d-stage" role="img" aria-label="Dados poliédricos tridimensionais animados sobre mesa, incluindo d4, d6, d8, d10, d12 e d20"/><span className="tdice-3d-legend">MESA 3D · RESULTADO COMPARTILHADO</span></div>;
}
