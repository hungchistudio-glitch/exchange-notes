import * as THREE from "three";
import { EYE_RADIUS, TUBE_FRONT, TUBE_RADIUS } from "./anatomy";
import { brass, chrome, ellipseRing, extrude, glaze, group, irisCap, irisTexture, lathe, mesh, phys, roundedRect, std, type NeckPiece } from "./outfitKit";

/** Collection 03. Its small parts and attachment frames (block … collar)
 * are exported for Collection 04, which hangs from the same places.
 * All pieces are closed solids, in the shared wardrobe's
 * attachment frames. Motion is metadata consumed by the existing scene loop;
 * a builder never owns a timer, a renderer, or a canvas. */
type Builder = () => THREE.Object3D;
type Point = [number, number, number];
const metal = () => std(0x252c35, .78, .29);
const ivory = () => glaze(0xf1e9d8, .37);
export function block(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(extrude(roundedRect(w, h, Math.min(w, h) * .16), d, .006, 8), mat, x, y, z);
}
export function ball(r: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.SphereGeometry(r, 20, 12), mat, x, y, z);
}
export function ring(r: number, t: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(r, t, 8, 32), mat, x, y, z);
}
export function disc(r: number, depth: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const o = mesh(new THREE.CylinderGeometry(r, r, depth, 40), mat, x, y, z);
  o.rotation.x = Math.PI / 2;
  return o;
}
export function wire(points: Point[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return group(mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 6), radius, 6, false), mat),
    ball(radius, mat, ...points[0]), ball(radius, mat, ...points[points.length - 1]));
}
export function polygon(points: [number, number][], depth: number, mat: THREE.Material) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => { if (i) s.lineTo(x, y); else s.moveTo(x, y); });
  s.closePath();
  return mesh(extrude(s, depth, .008, 8), mat);
}
/** The top of the bail, including its wire, is exactly y=0. */
export function hanging(body: THREE.Object3D, offset: number, mat: THREE.Material = brass()) {
  body.position.y -= offset;
  return group(ring(.035, .009, mat, 0, -.044), body);
}
export function pin(body: THREE.Object3D) {
  // A backing plate plus a recessed stem, visible when the stand is turned.
  return group(body, block(.15, .09, .035, brass(), 0, 0, -.04), wire([[0, -.045, -.04], [0, .045, -.09]], .015, brass()));
}
export function brow(body: THREE.Object3D) {
  // Authored front-on XY -> ring frame (X outward, Y forward, Z tangent).
  const root = group(body);
  root.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  root.position.y = TUBE_FRONT + .045;
  return root;
}
export function necklace(pendant: THREE.Object3D, y = -.30) {
  const gold = brass();
  pendant.position.set(0, y, .07);
  return group(wire([[-.65, .25, -.05], [-.38, -.01, .035], [0, -.13, .07], [.38, -.01, .035], [.65, .25, -.05]], .018, gold),
    ring(.038, .012, gold, 0, -.14, .075), pendant);
}
export function hat(body: THREE.Object3D) {
  const clamp = ellipseRing(TUBE_FRONT + .025, TUBE_RADIUS + .015, .025, metal());
  clamp.rotation.y = Math.PI / 2;
  clamp.position.y = -TUBE_RADIUS * .82;
  return group(clamp, body);
}
export function collar(front: THREE.Object3D, mat: THREE.Material): NeckPiece {
  const band = ellipseRing(TUBE_RADIUS + .025, TUBE_FRONT + .025, .045, mat);
  return { band, front };
}
function motion<T extends THREE.Object3D>(o: T, kind: "float" | "rotate" | "pulse") {
  o.userData.collection03Motion = kind;
  return o;
}
function light() { return std(0x95c8cf, .3, .33, { emissive: 0x7ec8d8, emissiveIntensity: .08 }); }

// Single earrings: one cuff is supplied by the shared mounting system.
export const COLLECTION03_EARRINGS: Record<string, Builder> = {
  "s33v3-window-lattice": () => {
    const gold = brass(), jade = glaze(0x61877b);
    const frame = wire([[0,.17,.025],[.17,0,.025],[0,-.17,.025],[-.17,0,.025],[0,.17,.025]], .014, gold);
    const diamond = polygon([[0,.17],[.17,0],[0,-.17],[-.17,0]], .034, jade);
    const lines = group();
    for (const v of [-.065, 0, .065]) {
      lines.add(wire([[-.11,v,.029],[.11,v,.029]], .007, gold), wire([[v,-.11,.029],[v,.11,.029]], .007, gold));
    }
    const body = group(diamond, frame, lines);
    return hanging(body, .265, gold);
  },
  "s33v3-vinyl-disc": () => {
    const black = std(0x11141b,.35,.25), red = glaze(0xb24a46);
    const body = group(disc(.18,.045,black), disc(.062,.052,red), disc(.014,.058,chrome()));
    for (const r of [.09,.12,.15,.166]) body.add(ring(r,.003,metal(),0,0,.026));
    return hanging(body,.265);
  },
  "s33v3-canele-bell": () => {
    const gold = brass();
    const body = group(mesh(lathe([[0,-.15],[.13,-.15],[.14,-.12],[.105,.11],[.07,.14],[0,.14]],32),gold));
    for(let i=0;i<10;i++) {const a=i*Math.PI/5; body.add(wire([[Math.cos(a)*.135,-.12,Math.sin(a)*.135],[Math.cos(a)*.11,.07,Math.sin(a)*.11]],.012,gold));}
    return hanging(body,.235,gold);
  },
  "s33v3-farfalle": () => {
    const gold=brass();
    const body=polygon([[-.19,.12],[-.04,.045],[.04,.045],[.19,.12],[.17,0],[.19,-.12],[.04,-.045],[-.04,-.045],[-.19,-.12],[-.17,0]],.065,gold);
    const g=group(body,block(.07,.13,.085,gold));
    for(const sign of [-1,1]) for(const y of [-.06,.06]) g.add(wire([[sign*.04,y*.4,.045],[sign*.16,y,.048]],.008,ivory()));
    return hanging(g,.22,gold);
  },
  "s33v3-castanet": () => {
    const wood=std(0x6a3d29,.02,.46), gold=brass();
    const front=ball(.155,wood,0,0,.04); front.scale.set(1,1.2,.33);
    const back=front.clone(); back.position.z=-.06; back.rotation.x=-.18;
    return hanging(group(front,back,wire([[-.06,.12,.05],[0,.17,.07],[.06,.12,.05]],.012,gold),ring(.09,.006,gold,0,0,.089)),.29,gold);
  },
  "s33v3-black-tuning": () => {
    const m=metal();
    const fork=wire([[-.12,.12,0],[-.12,-.15,0],[0,-.22,0],[.12,-.15,0],[.12,.12,0]],.027,m);
    return hanging(group(fork,block(.24,.04,.05,m,0,.12),block(.055,.10,.06,chrome(),0,-.20)),.205,m);
  },
  "s33v3-levitation-ear": () => {
    const m=metal(); const frame=ellipseRing(.13,.22,.027,m);
    const orb=motion(ball(.065,chrome()),"float");
    return hanging(group(frame,orb,block(.09,.055,.09,light(),0,.18),block(.09,.055,.09,m,0,-.18)),.32,m);
  },
};

export const COLLECTION03_PIN: Record<string, Builder> = {
  "s33v3-rail-ticket": () => {
    const paper=glaze(0xdcc8a3,.55), ink=std(0x3f687e);
    const body=group(block(.55,.30,.07,paper));
    body.add(wire([[-.23,-.08,.043],[-.09,.02,.043],[.01,-.01,.043],[.10,.08,.043],[.23,.04,.043]],.012,ink));
    for(const x of [-.23,.23]) for(const y of [-.105,.105]) body.add(ball(.022,brass(),x,y,.048));
    for(const x of [-.16,-.10,-.04,.02]) body.add(block(.033,.016,.015,ink,x,.105,.045));
    return pin(body);
  },
  "s33v3-canyon-post": () => {
    const cream=ivory(), gold=brass();
    const body=group(block(.43,.52,.045,cream));
    const land=polygon([[-.18,-.20],[-.18,.01],[-.09,.08],[0,-.015],[.07,.08],[.18,-.03],[.18,-.20]],.015,glaze(0xa9684b));land.position.z=.035;
    body.add(land,disc(.052,.012,gold,.10,.15,.035));
    for(let i=0;i<7;i++)for(const side of [-1,1])body.add(ball(.012,gold,side*.198,-.21+i*.07,.033));
    return pin(body);
  },
  "s33v3-sundial": () => {
    const gold=brass();const body=group(disc(.23,.045,gold));
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=block(.008,.033,.01,metal(),Math.sin(a)*.19,Math.cos(a)*.19,.032);tick.rotation.z=-a;body.add(tick);}
    const gnomon=polygon([[-.04,-.04],[.04,-.04],[0,.17]],.025,glaze(0x963f34));gnomon.rotation.x=.9;gnomon.position.z=.10;body.add(gnomon);
    return pin(body);
  },
  "s33v3-singularity-seal": () => {
    const m=metal();const blades=group();
    for(let i=0;i<3;i++){const arc=mesh(new THREE.TorusGeometry(.14,.023,8,24,Math.PI*.48),chrome());arc.rotation.z=i*Math.PI*2/3;blades.add(arc);}
    blades.position.z=.045;motion(blades,"rotate");
    return pin(group(disc(.21,.055,m),blades,disc(.036,.06,ivory())));
  },
};

function bowlFood(kind: "ice" | "shake" | "bread" | "cake" | "pintxo") {
  const g=group(), cream=ivory(), gold=brass();
  if(kind==="ice") {
    g.add(mesh(lathe([[0,-.15],[.10,-.15],[.23,.025],[.23,.045],[.20,.045],[.09,-.12],[0,-.12]],32),cream));
    for(let i=0;i<5;i++){const ice=disc(.19-i*.026,.025,glaze(0xf7efe0),0,.045+i*.023);ice.rotation.x=0;g.add(ice);}
    const mango=glaze(0xe7af38);for(let i=0;i<5;i++)g.add(block(.055,.045,.052,mango,Math.sin(i*2.4)*.10,.15+(i%2)*.02,Math.cos(i*2.4)*.08));
  } else if(kind==="shake") {
    g.add(mesh(lathe([[0,-.22],[.085,-.22],[.12,.14],[.10,.16],[0,.16]],32),glaze(0xd6a5a6)));
    for(let i=0;i<4;i++){const swirl=ring(.10-i*.018,.028,cream,0,.16+i*.023);swirl.rotation.x=Math.PI/2;g.add(swirl);}
    const top=ball(.07,cream,0,.20);g.add(top,wire([[.065,.10,0],[.09,.29,0],[.15,.31,0]],.012,gold));
  } else if(kind==="bread") {
    g.add(mesh(new THREE.CylinderGeometry(.18,.15,.22,24),std(0x956547),0,-.08),ball(.18,glaze(0xbb874c,.5),0,.06));
    for(let i=0;i<12;i++){const a=i*2.4;g.add(ball(.015,glaze(i%2?0x704936:0xc1743b),Math.sin(a)*.14,.10+Math.cos(i*1.1)*.07,Math.cos(a)*.14));}
  } else if(kind==="cake") {
    const cake=ball(.19,glaze(0xd1ab6a,.5));cake.scale.set(.8,1,.45);g.add(cake);
    for(let i=-2;i<=2;i++)g.add(wire([[i*.015,-.14,.04],[i*.045,.02,.09],[i*.035,.14,.04]],.009,glaze(0xb18a50,.5)));
    g.add(block(.23,.065,.13,cream,0,-.15));
  } else {
    g.add(block(.36,.10,.18,glaze(0xc49b63,.55),0,-.13));
    const pepper=wire([[-.12,-.04,.04],[0,.04,.04],[.12,-.02,.04]],.038,glaze(0xa44030));g.add(pepper,ball(.063,glaze(0x687441),0,.08));
    g.add(wire([[.015,-.16,0],[.015,.24,0]],.009,gold));
  }
  // A discreet carrier loop runs behind the food to the mouth's supplied clip.
  const box=new THREE.Box3().setFromObject(g);const height=box.max.y;
  g.position.y=-height-.10;
  return group(ring(.035,.009,gold,0,-.044),wire([[0,-.08,-.06],[-.11,-.18,-.08],[0,g.position.y-.14,-.08]],.012,gold),g);
}
export const COLLECTION03_MOUTH: Record<string, Builder> = {
  "s33v3-snow-ice":()=>bowlFood("ice"), "s33v3-diner-shake":()=>bowlFood("shake"),
  "s33v3-madeleine":()=>bowlFood("cake"), "s33v3-panettone":()=>bowlFood("bread"), "s33v3-pintxo":()=>bowlFood("pintxo"),
};

export const COLLECTION03_NECKLACE: Record<string, Builder> = {
  "s33v3-rice-parcel":()=>{
    const leaf=glaze(0x657e53,.43), gold=brass();
    const parcel=mesh(new THREE.TetrahedronGeometry(.21),leaf);parcel.rotation.z=Math.PI/4;
    return necklace(group(parcel,wire([[-.10,.07,.10],[.11,-.08,.10]],.007,gold),wire([[-.10,-.08,.10],[.10,.08,.10]],.007,gold)),-.30);
  },
  "s33v3-skyline-pendant":()=>{
    const m=chrome();return necklace(group(block(.07,.20,.055,m,-.09,-.01),block(.08,.32,.065,m,0,.05),block(.07,.25,.055,m,.09,.015),block(.27,.035,.07,m,0,-.11)),-.34);
  },
  "s33v3-orange-blossom":()=>{
    const flower=group();const mat=ivory();
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const petal=ball(.065,mat,Math.sin(a)*.09,Math.cos(a)*.09);petal.scale.set(.7,1,.35);petal.rotation.z=-a;flower.add(petal);}
    flower.add(ball(.041,brass(),0,0,.025));
    for(const sign of [-1,1]){const leaf=ball(.09,glaze(0x6b8060),sign*.13,-.07,-.018);leaf.scale.set(.45,1,.25);leaf.rotation.z=sign*-.8;flower.add(leaf);}
    return necklace(flower,-.31);
  },
  "s33v3-checksum":()=>{
    const m=metal(), frame=group();
    for(const y of [-.13,.13])frame.add(block(.28,.04,.065,m,0,y));
    for(const x of [-.12,.12])frame.add(block(.04,.23,.065,m,x));
    frame.add(block(.105,.105,.08,ivory()));
    return necklace(frame,-.32);
  },
};

export const COLLECTION03_BROW: Record<string, Builder> = {
  "s33v3-metro-arch":()=>{
    const green=glaze(0x4b6a57);const g=group();
    for(const x of [-.11,.11])g.add(wire([[x-.08,-.05,0],[x-.06,.10,0],[x+.06,.10,0],[x+.08,-.05,0]],.025,green),ball(.025,brass(),x-.08,-.05,.01));
    return brow(g);
  },
  "s33v3-loggia-cuff":()=>{
    const m=ivory(),g=group(block(.55,.055,.075,m,0,.14),block(.55,.045,.075,m,0,-.10));
    for(let i=0;i<4;i++)g.add(block(.035,.22,.07,m,-.255+i*.17,.01));
    for(let i=0;i<3;i++){const arch=mesh(new THREE.TorusGeometry(.068,.019,8,16,Math.PI),m,-.17+i*.17,.055);g.add(arch);}
    return brow(g);
  },
  "s33v3-memory-cuff":()=>{
    const m=metal();return brow(group(block(.47,.18,.10,m),motion(block(.32,.014,.014,light(),0,.02,.061),"pulse"),block(.07,.21,.12,chrome(),-.19)));
  },
  "s33v3-phase-bridge":()=>brow(group(block(.10,.15,.12,metal(),-.22),block(.10,.15,.12,metal(),.22),motion(wire([[-.19,0,.035],[0,.055,.035],[.19,0,.035]],.016,light()),"pulse"))),
};

export const COLLECTION03_HEAD: Record<string, Builder> = {
  "s33v3-market-canopy":()=>{
    const red=glaze(0xa9554d,.5), cream=ivory(),g=group();
    for(let i=0;i<7;i++){const panel=block(.14,.06,.76,i%2?cream:red,-.42+i*.14,.13);panel.rotation.z=(-3+i)*-.07;g.add(panel);g.add(block(.135,.13,.045,i%2?cream:red,-.42+i*.14,.065,.37));}
    g.add(wire([[-.40,.08,-.32],[-.40,.01,.32]],.018,brass()),wire([[.40,.08,-.32],[.40,.01,.32]],.018,brass()));return hat(g);
  },
  "s33v3-quilt-hood":()=>{
    const cloth=std(0xdcd2bf,0,.87),g=group();
    const profile: [number, number][]=[];
    for(let i=0;i<=12;i++){const a=i*Math.PI/24;profile.push([Math.cos(a)*.47,Math.sin(a)*.47]);}
    for(let i=12;i>=0;i--){const a=i*Math.PI/24;profile.push([Math.cos(a)*.44,Math.sin(a)*.44]);}
    profile.push([.47,0]);
    const hood=mesh(lathe(profile,32),cloth,0,.055);hood.scale.set(1.1,1,.95);g.add(hood);
    for(const x of [-.28,-.14,0,.14,.28])g.add(wire([[x,.09,-.38],[x,.37,-.16],[x,.45,0],[x,.36,.19],[x,.09,.40]],.01,ivory()));
    const rim=ellipseRing(.5,.43,.035,cloth);rim.rotation.x=Math.PI/2;rim.position.y=.06;g.add(rim);return hat(g);
  },
  "s33v3-tailored-cap":()=>{
    const cloth=std(0x687060,.02,.8), seam=std(0x9b9e86,0,.82),g=group();
    const cap=ball(.46,cloth,0,.12);cap.scale.set(1.12,.55,1);g.add(cap);
    const brim=block(.67,.045,.42,cloth,0,.025,.31);g.add(brim,ball(.035,seam,0,.38));
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.add(wire([[0,.375,0],[Math.sin(a)*.32,.30,Math.cos(a)*.28],[Math.sin(a)*.49,.12,Math.cos(a)*.43]],.006,seam));}return hat(g);
  },
  "s33v3-folded-headset":()=>{
    const m=metal(),g=group(wire([[-.46,.02,0],[-.35,.22,0],[.25,.25,0],[.46,.03,0]],.035,m));
    for(const side of [-1,1]){const wing=block(.23,.18,.33,m,side*.43,.10);wing.rotation.z=side*.32;g.add(wing,block(.025,.12,.30,chrome(),side*.47,.10));}
    return hat(g);
  },
};
export const COLLECTION03_NECK: Record<string,()=>NeckPiece> = {
  "s33v3-atelier-collar":()=>{
    const m=std(0x36393e,0,.82);const g=group(block(.65,.32,.085,m));
    const slash=block(.075,.37,.018,ivory(),.10,0,.06);slash.rotation.z=-.5;g.add(slash);return collar(g,m);
  },
  "s33v3-woven-cape":()=>{
    const m=std(0x67465a,0,.92), gold=brass(),g=group();
    for(let i=-1;i<=1;i++){const fold=polygon([[-.15,.17],[.15,.17],[.20,-.28],[-.20,-.28]],.04,m);fold.position.set(i*.20,0,Math.abs(i)*-.08);fold.rotation.y=i*-.2;g.add(fold);}
    g.add(wire([[-.39,-.28,-.08],[0,-.28,.04],[.39,-.28,-.08]],.015,gold));return collar(g,m);
  },
  "s33v3-carbon-collar":()=>{
    const m=metal(),g=group();for(let i=0;i<3;i++)g.add(block(.66-i*.05,.07,.13,m,0,.12-i*.11,.02+i*.035));
    for(const x of [-.23,.23])g.add(block(.028,.30,.16,chrome(),x));return collar(g,m);
  },
};
export const COLLECTION03_CHARM: Record<string, Builder> = {
  "s33v3-bookstall":()=>{
    const green=glaze(0x506d59,.4),g=group(block(.44,.20,.12,green,0,-.09));
    const lid=block(.44,.22,.04,green,0,.09,-.06);lid.rotation.x=-.55;g.add(lid);
    for(let i=0;i<3;i++){const book=block(.10,.16,.065,glaze([0xbe9d76,0x9f6655,0xe1d3b1][i]),-.13+i*.13,-.02,.07);book.rotation.z=(i-1)*-.12;g.add(book);}
    return hanging(g,.30);
  },
  "s33v3-gondola":()=>{
    const m=metal(),gold=brass();const hull=ball(.30,m);hull.scale.set(1.35,.21,.40);
    const g=group(hull,block(.12,.06,.15,glaze(0x9e3c3f),0,.04));
    for(const sign of [-1,1])g.add(wire([[sign*.30,0,0],[sign*.37,.07,0],[sign*.39,.13,0]],.018,gold));
    g.position.y=-.28;
    return group(ring(.035,.009,gold,0,-.044),wire([[0,-.08,0],[-.27,-.25,0]],.009,gold),wire([[0,-.08,0],[.27,-.25,0]],.009,gold),g);
  },
  "s33v3-probe-pod":()=>{
    const m=metal(),g=group(mesh(lathe([[0,-.24],[.09,-.18],[.09,.13],[.06,.20],[0,.22]],24),m));
    for(let i=0;i<3;i++){const fin=polygon([[0,.06],[.15,-.12],[.15,-.23],[0,-.15]],.025,chrome());fin.rotation.y=i*Math.PI*2/3;g.add(fin);}
    g.add(motion(ball(.062,light(),0,.17),"pulse"));return hanging(g,.32,m);
  },
};
export const COLLECTION03_EYEWEAR: Record<string, Builder> = {
  "s33v3-smoked-gimbal":()=>{
    const m=metal();const inner=ring(.54,.026,m,0,0,.70);const outer=ring(.60,.024,chrome(),0,0,.68);outer.rotation.y=.16;
    const lens=disc(.51,.025,phys(0x71828d,{transparent:true,opacity:.20,depthWrite:false,roughness:.18,clearcoat:1}),0,0,.71);
    lens.name="collection03-gimbal-lens";
    const g=group(inner,outer,lens,ball(.04,m,-.57,0,.70),ball(.04,m,.57,0,.70));
    for(const sign of [-1,1])g.add(wire([[sign*.57,0,.70],[sign*.60,0,.42],[sign*.54,0,.25]],.018,m));
    return g;
  },
};
export const COLLECTION03_PUPILS: Record<string, Builder> = {
  "s33v3-eclipse-cut":()=>{
    const pupil=disc(.25,.045,glaze(0x151a21),0,0,EYE_RADIUS+.016);
    const cut=block(.035,.35,.012,ivory(),0,0,EYE_RADIUS+.043);cut.rotation.z=-.48;
    return group(pupil,cut);
  },
};
export const COLLECTION03_IRISES: Record<string, Builder> = {
  "s33v3-telemetry-iris":()=>{
    const g=group(irisCap(irisTexture(33033, "#647e8c", "#283b49", "#aabdc7")));
    const marks=group();
    for(let i=0;i<24;i++){const a=i*Math.PI/12;const tick=mesh(new THREE.BoxGeometry(.009,i%4===0?.04:.018,.008),ivory(),Math.sin(a)*.35,Math.cos(a)*.35,Math.sqrt(EYE_RADIUS**2-.35**2)+.02);tick.rotation.z=-a;marks.add(tick);}
    motion(marks,"rotate");g.add(marks);return g;
  },
};
