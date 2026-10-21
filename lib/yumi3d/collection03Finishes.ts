import * as THREE from "three";
import { FINISH03_DATA } from "./collection03FinishesData";
import { paint, SHELL_REPEAT, type ShellFinish } from "./outfitKit";

/** Painted once per finish change. Glass is a coated, tinted optical finish,
 * not screen-space refraction: no second scene pass on a phone. */
export const COLLECTION03_FINISHES: Record<string, ShellFinish> = Object.fromEntries(FINISH03_DATA.map((f, index) => {
  const textile = f.id.endsWith("suede") || f.id.endsWith("velvet");
  const anodized = f.id.endsWith("anodized") || f.id.endsWith("violet");
  return [f.id, {
    color: 0xffffff,
    metalness: f.pbr.metalness, roughness: f.pbr.roughness,
    clearcoat: f.family === "glass" ? .9 : f.pbr.clearcoat,
    clearcoatRoughness: f.id.endsWith("seaglass") ? .35 : .12,
    envMapIntensity: f.family === "metal" ? 1.15 : .85,
    iridescence: anodized ? .45 : 0,
    sheen: textile ? .8 : 0,
    sheenColor: f.accent,
    sheenRoughness: .7,
    map: () => paint(512, 256, 33300 + index, (ctx, rand, w, h) => {
      ctx.fillStyle=f.tone;ctx.fillRect(0,0,w,h);
      if(f.family === "glass") {
        const wash=ctx.createLinearGradient(0,0,0,h);
        wash.addColorStop(0,"rgba(255,255,255,.05)");wash.addColorStop(.24,"rgba(255,255,255,.38)");wash.addColorStop(.55,"rgba(28,38,52,.20)");wash.addColorStop(.83,"rgba(255,255,255,.20)");wash.addColorStop(1,"rgba(255,255,255,.05)");
        ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
      } else if(f.family === "mineral" || f.id.endsWith("crackle")) {
        ctx.strokeStyle=f.accent;ctx.lineWidth=f.id.endsWith("crackle")?1.2:2.5;
        for(let i=0;i<24;i++) {
          let x=rand()*w,y=rand()*h;ctx.beginPath();ctx.moveTo(x,y);
          for(let j=0;j<7;j++){x+=rand()*50-15;y+=rand()*40-20;ctx.lineTo(x,y);}ctx.globalAlpha=.35+rand()*.25;ctx.stroke();
        }
        ctx.globalAlpha=1;
        if(f.id.endsWith("obsidian"))for(let i=0;i<35;i++){ctx.fillStyle=f.accent;ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(rand()*w,rand()*h,3+rand()*7,0,Math.PI*2);ctx.fill();}
      } else if(f.id.endsWith("carbon")) {
        for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){ctx.fillStyle=(x/16+y/16)%2?f.accent:f.tone;ctx.fillRect(x,y,14,14);ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(x+7,y,3,14);}
      } else if(f.family === "metal") {
        for(let i=0;i<180;i++){ctx.strokeStyle=i%2?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)";ctx.lineWidth=.8;const y=rand()*h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      } else {
        for(let i=0;i<800;i++){ctx.globalAlpha=.08+rand()*.10;ctx.fillStyle=i%2?f.accent:"#ffffff";const r=f.id.endsWith("pebble")?2+rand()*3:.8+rand();ctx.beginPath();ctx.arc(rand()*w,rand()*h,r,0,Math.PI*2);ctx.fill();}
      }
      ctx.globalAlpha=1;
    }, SHELL_REPEAT),
    surface: () => {
      const texture=paint(256,128,33300+index,(ctx,rand,w,h)=>{
        ctx.fillStyle="rgb(0,255,255)";ctx.fillRect(0,0,w,h);
        for(let i=0;i<240;i++){const v=Math.round(190+rand()*65);ctx.fillStyle=`rgb(0,${v},255)`;ctx.fillRect(rand()*w,rand()*h,f.family==="metal"?20:4,2);}
      },SHELL_REPEAT);
      texture.colorSpace=THREE.NoColorSpace;
      return texture;
    },
  } satisfies ShellFinish];
}));
