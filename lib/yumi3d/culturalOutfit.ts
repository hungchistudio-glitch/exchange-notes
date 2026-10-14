import * as THREE from "three";
import { CULTURAL_ITEMS } from "@/lib/shop/culturalCollection";

/** Small, solid, inspectable souvenirs: shared geometries per piece, no frame loop. */
const items = new Map(CULTURAL_ITEMS.map(item => [item.id, item]));
export const CULTURAL_PALETTES = {
  tw: ["#da4d49", "#f3ecdd", "#334f91"],
  us: ["#b94a50", "#f3ecdd", "#385689"],
  fr: ["#355b9c", "#f3ecdd", "#d35455"],
  it: ["#439070", "#f3ecdd", "#c95c53"],
  es: ["#ba403c", "#e4bd51", "#ba403c"],
} as const;
const DATES = { tw: "10 OCT", us: "04 JUL", fr: "14 JUL", it: "02 JUN", es: "12 OCT" };
const metal = (color = "#cbb78a") => new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.25 });
const enamel = (color: string) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.24, clearcoat: 0.85 });
function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x=0, y=0, z=0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); return m;
}
function orb(r: number, m: THREE.Material, x=0,y=0,z=0) { return mesh(new THREE.SphereGeometry(r,16,12),m,x,y,z); }
function hoop(r: number, tube: number, m: THREE.Material, x=0,y=0,z=0) { return mesh(new THREE.TorusGeometry(r,tube,8,32),m,x,y,z); }
function box(w: number,h: number,d: number,m: THREE.Material,x=0,y=0,z=0) { return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z); }
function wire(points: number[][], material: THREE.Material, radius=0.018) {
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
  return mesh(new THREE.TubeGeometry(curve,32,radius,6,false),material);
}
function star(material: THREE.Material) {
  const shape = new THREE.Shape();
  for(let i=0;i<10;i++) { const a=Math.PI/2+i*Math.PI/5,r=i%2?0.075:0.17; if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r); }
  shape.closePath();
  return mesh(new THREE.ExtrudeGeometry(shape,{depth:0.05,bevelEnabled:true,bevelSize:0.009,bevelThickness:0.009,bevelSegments:2}),material);
}

function motif(country: keyof typeof DATES, food: boolean): THREE.Group {
  const g=new THREE.Group(), gold=metal(), cream=enamel("#f0e4ce");
  if(food && country==='tw') {
    g.add(mesh(new THREE.CylinderGeometry(.12,.085,.25,20),enamel('#c8a57f'),0,-.01));
    g.add(mesh(new THREE.CylinderGeometry(.018,.018,.25,8),gold,.04,.16));
    for(const x of [-.05,.03])for(const y of [-.08,-.02])g.add(orb(.025,enamel('#493735'),x,y,.095));
  } else if(food && (country==='us'||country==='es')) {
    g.add(hoop(.13,country==='us'?.054:.035,enamel('#c68d48')));
    for(let i=0;i<12;i++){const a=i*Math.PI/6;g.add(orb(.012,cream,Math.cos(a)*.13,Math.sin(a)*.13,.042));}
  } else if(food && country==='fr') {
    for(const y of [-.05,.05]) {const half=orb(.145,enamel('#d995b0'),0,y);half.scale.y=.4;g.add(half);}
    const filling=mesh(new THREE.CylinderGeometry(.135,.135,.034,24),cream); g.add(filling);
  } else if(food && country==='it') {
    const cone=mesh(new THREE.ConeGeometry(.09,.21,20),enamel('#cd9d62'),0,-.1);cone.rotation.z=Math.PI;g.add(cone,orb(.115,enamel('#a6bd7c'),0,.05));
  } else if(country==='tw') {
    g.add(hoop(.14,.049,enamel('#69a28a')),hoop(.19,.012,gold));
  } else if(country==='us') {g.add(star(metal('#cbd8e6')));
  } else if(country==='fr') {g.add(hoop(.17,.014,gold),orb(.083,cream,0,-.1));
  } else if(country==='it') {
    g.add(orb(.15,enamel('#599eab')));
    for(let i=0;i<6;i++){const a=i*Math.PI/3;g.add(orb(.042,enamel('#d58066'),Math.cos(a)*.08,Math.sin(a)*.08,.12));}g.add(orb(.035,cream,0,0,.15));
  } else {
    for(let i=0;i<7;i++) {const a=(i/6-.5)*2;const rib=box(.04,.23,.025,i%2?gold:enamel('#bf4c48'));rib.position.set(Math.sin(a)*.1,Math.cos(a)*.1,0);rib.rotation.z=-a;g.add(rib);}
  }
  return g;
}

/** Original souvenir artwork, including the independently verified national date. */
function stamp(country: keyof typeof DATES) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=320;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#efe8d9';ctx.fillRect(0,0,256,320);
  const colors=CULTURAL_PALETTES[country];colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(24+i*69,70,69,158);});
  ctx.strokeStyle='#efe8d9';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(128,147,75,39,-.4,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#efe8d9';ctx.beginPath();ctx.arc(128,147,23,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#26313c';ctx.textAlign='center';ctx.font='600 22px sans-serif';ctx.fillText(`${country.toUpperCase()} / ORBIT POST`,128,46);
  ctx.font='600 29px monospace';ctx.fillText(DATES[country],128,276);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const g=new THREE.Group();g.add(box(.43,.55,.045,enamel('#e8ddc8')));
  const face=mesh(new THREE.PlaneGeometry(.41,.52),new THREE.MeshStandardMaterial({map:texture,roughness:.7}),0,0,.025);g.add(face);
  const edge=enamel('#e8ddc8'), geo=new THREE.CylinderGeometry(.022,.022,.047,8);
  for(let i=0;i<9;i++)for(const side of [-1,1]){const p=mesh(geo,edge,side*.214,(i-4)*.057);p.rotation.x=Math.PI/2;g.add(p);}
  for(let i=0;i<7;i++)for(const side of [-1,1]){const p=mesh(geo,edge,(i-3)*.057,side*.274);p.rotation.x=Math.PI/2;g.add(p);}
  return g;
}

export function buildCulturalPiece(id: string): THREE.Group | null {
  const item=items.get(id); if(!item||item.country==='basic'||item.slot==='material'||item.slot==='neck')return null;
  const country=item.country, colors=CULTURAL_PALETTES[country],g=new THREE.Group(),gold=metal();
  if(item.slot==='earrings') {
    g.add(hoop(.055,.015,gold,0,.19));
    const pendant=motif(country,item.variant===0);
    pendant.position.y=-.13;
    g.add(pendant,wire([[0,.14,0],[0,.06,.01],[0,.01,0]],gold,.013));
  } else if(item.slot==='brow') {
    const ring=mesh(new THREE.TorusGeometry(.16,.025,10,32,Math.PI*1.52),gold);ring.rotation.z=-.78;g.add(ring);
    colors.forEach((color,i)=>g.add(orb(.047,enamel(color),Math.cos(i*.65+.35)*.16,Math.sin(i*.65+.35)*.16,.02)));
  } else if(item.slot==='necklace') {
    g.add(wire([[-.65,.25,0],[-.5,-.03,.03],[0,-.3,.1],[.5,-.03,.03],[.65,.25,0]],gold,.022));
    const pendant=new THREE.Group();
    if(country==='tw') {
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;pendant.add(orb(.065,enamel('#c890ad'),Math.cos(a)*.09,Math.sin(a)*.09));}
      pendant.add(orb(.04,gold,0,0,.05));
    } else if(country==='us') {
      const tag=box(.21,.29,.035,metal('#b8c4d3'));pendant.add(tag);
      for(let i=0;i<3;i++)pendant.add(box(.12,.009,.005,gold,0,(i-1)*.05,.02));
    } else if(country==='fr') {pendant.add(hoop(.16,.015,gold),orb(.095,enamel('#f1e6d3')));
    } else if(country==='it') {
      const disc=mesh(new THREE.CylinderGeometry(.16,.16,.035,32),gold);disc.rotation.x=Math.PI/2;pendant.add(disc,orb(.07,enamel('#ddb467'),0,0,.03));
    } else {
      pendant.add(box(.26,.26,.04,gold));
      for(const x of [-1,1])for(const y of [-1,1])pendant.add(box(.104,.104,.015,enamel(x===y?'#4a7da5':'#efe1b7'),x*.058,y*.058,.03));
      pendant.rotation.z=Math.PI/4;
    }
    pendant.position.set(0,-.39,.1);g.add(pendant,hoop(.045,.012,gold,0,-.27,.1));
  } else if(item.slot==='head') {
    const fabric=new THREE.MeshStandardMaterial({color:item.tone,roughness:.83});
    if(country==='us') {
      const dome=mesh(new THREE.SphereGeometry(.48,32,16,0,Math.PI*2,0,Math.PI/2),fabric);dome.scale.y=1.08;
      g.add(dome,mesh(new THREE.CylinderGeometry(.49,.49,.16,32),fabric,0,.04),orb(.11,fabric,0,.56));
    } else {
      const brim=mesh(new THREE.CylinderGeometry(country==='tw'?.62:.73,country==='tw'?.67:.73,.07,40),fabric);brim.scale.z=.8;g.add(brim);
      const crown=mesh(new THREE.CylinderGeometry(country==='tw'?.35:.43,country==='tw'?.49:.44,country==='it'?.42:.3,32),fabric,0,.19);crown.scale.z=.78;g.add(crown);
      const band=mesh(new THREE.CylinderGeometry(.45,.455,.055,32),enamel(colors[0]),0,.09);band.scale.z=.8;g.add(band);
    }
    colors.forEach((color,i)=>g.add(box(.06,.065,.035,enamel(color),(i-1)*.064,.11,.39)));
  } else if(item.slot==='pin') {g.add(stamp(country));
  } else if(item.slot==='charm') {
    g.add(box(.4,.48,.16,metal('#9ca9b2')),box(.31,.32,.025,enamel('#223443'),0,.015,.092));
    colors.forEach((color,i)=>g.add(box(.08,.23,.02,enamel(color),(i-1)*.09,.035,.111)));
    g.add(orb(.026,enamel('#d9ecdf'),0,-.18,.1),wire([[.1,.24,0],[.1,.34,0],[.2,.4,0]],gold));
    if(country==='es')for(const side of [-1,1])g.add(box(.16,.32,.04,enamel('#405978'),side*.31));
    if(country==='fr')g.add(hoop(.09,.02,gold,0,0,.13));
    if(country==='it')g.add(orb(.065,enamel('#d5e6d9'),0,.04,.15));
  }
  return g;
}

export function buildCulturalScarf(id: string) {
  const item=items.get(id);if(!item||item.slot!=='neck'||item.country==='basic')return null;
  const colors=CULTURAL_PALETTES[item.country];
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d')!;
  colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*32,0,32,96);});
  ctx.globalAlpha=.15;ctx.fillStyle='#fff';for(let y=0;y<96;y+=4)ctx.fillRect(0,y,96,1);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshPhysicalMaterial({map,roughness:.67,sheen:.6,side:THREE.DoubleSide});
  const band=mesh(new THREE.CylinderGeometry(.51,.51,.28,40,1,true),mat);band.rotation.x=Math.PI/2;band.scale.y=.72;
  const front=new THREE.Group();front.add(orb(.12,mat));
  for(const side of [-1,1]) {const t=box(.18,side<0?.56:.42,.04,mat,side*.09,-.21,.015);t.rotation.z=side*.26;front.add(t);}
  return {band,front};
}

/** Opaque, inexpensive physical finishes. The lagoon uses coated glass colour,
 * avoiding screen-space transmission and its extra render pass on phones. */
export const CULTURAL_FINISHES = Object.fromEntries(CULTURAL_ITEMS.filter(i=>i.slot==='material').map(item=>[item.id,{
  color:item.tone,metalness: /copper|titanium|metal/.test(item.id)?.88:.06,
  roughness: /satin|frost/.test(item.id)?.5:.18,clearcoat:1,clearcoatRoughness:.1,
}]));
