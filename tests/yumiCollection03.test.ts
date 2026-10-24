import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COLLECTION03_ITEMS } from "@/lib/shop/collection03";
import { inShopCollection } from "@/lib/shop/collection03Presentation";
import { applyShellFinish, buildThumbnailObject, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";
import { COLLECTION03_EARRINGS, COLLECTION03_MOUTH, COLLECTION03_CHARM, COLLECTION03_EYEWEAR } from "@/lib/yumi3d/collection03Outfit";
import { collectCollection03Motion, updateCollection03Motion } from "@/lib/yumi3d/collection03Motion";
afterEach(()=>vi.restoreAllMocks());
function canvas(){
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(_t,name)=>name==="createLinearGradient"||name==="createRadialGradient"?()=>gradient:()=>{},set:()=>true});
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(ctx as CanvasRenderingContext2D);
}
function parts(){return {model:new THREE.Group(),eyeGroup:new THREE.Group(),lookGroup:new THREE.Group(),pupil:new THREE.Mesh(),shellMaterial:new THREE.MeshPhysicalMaterial()};}
describe("Station 33 Collection 03",()=>{
  it("contains five new souvenirs per country, twelve dark pieces and twenty finishes",()=>{
    for(const c of ["tw","us","fr","it","es"])expect(COLLECTION03_ITEMS.filter(i=>i.country===c)).toHaveLength(5);
    expect(COLLECTION03_ITEMS.filter(i=>inShopCollection(i,"dark03"))).toHaveLength(12);
    expect(COLLECTION03_ITEMS.filter(i=>inShopCollection(i,"finish03"))).toHaveLength(20);
  });
  it("builds every item with finite bounded geometry within the phone triangle budget",()=>{
    canvas();
    for(const item of COLLECTION03_ITEMS){
      const object=buildThumbnailObject(item.id);expect(object,item.id).not.toBeNull();
      const size=new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0&&v<6),item.id).toBe(true);
      let triangles=0;object!.traverse(o=>{if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;expect(Array.from(o.geometry.attributes.position.array).every(Number.isFinite),item.id).toBe(true);}});
      expect(triangles,item.id).toBeLessThan(20000);disposeObject(object!);
    }
  }, 15000);
  it("puts the top of hanging pieces at the physical attachment and wears one left earring",()=>{
    canvas();
    for(const [id,build]of Object.entries({...COLLECTION03_EARRINGS,...COLLECTION03_MOUTH,...COLLECTION03_CHARM})){
      const object=build(),box=new THREE.Box3().setFromObject(object);
      expect(box.max.y,id).toBeLessThanOrEqual(.02);expect(box.max.y,id).toBeGreaterThan(-.02);disposeObject(object);
    }
    for(const id of Object.keys(COLLECTION03_EARRINGS)){
      const p=parts(),rig=createOutfitRig(p),objects=rig.apply({earrings:id});
      expect(objects).toHaveLength(1);expect(new THREE.Box3().setFromObject(objects[0]).max.x,id).toBeLessThan(-.8);rig.dispose();
      expect(p.model.children).toHaveLength(0);
    }
  });
  it("keeps the smoked lens in front of the eye instead of cutting through it",()=>{
    const object=COLLECTION03_EYEWEAR["s33v3-smoked-gimbal"]();
    const lens=object.getObjectByName("collection03-gimbal-lens")!;
    expect(new THREE.Box3().setFromObject(lens).min.z).toBeGreaterThan(.6);
    disposeObject(object);
  });
  it("resets physical finish settings and disposes maps when switching to the original body",()=>{
    canvas();const mat=new THREE.MeshPhysicalMaterial();
    applyShellFinish(mat,"s33v3-oil-violet");expect(mat.iridescence).toBeGreaterThan(0);
    const old=mat.map!;const dispose=vi.spyOn(old,"dispose");
    applyShellFinish(mat,"s33v3-plum-velvet");expect(dispose).toHaveBeenCalledOnce();expect(mat.iridescence).toBe(0);expect(mat.sheen).toBeGreaterThan(0);
    applyShellFinish(mat,undefined);expect(mat.map).toBeNull();expect(mat.roughnessMap).toBeNull();expect(mat.metalnessMap).toBeNull();expect(mat.sheen).toBe(0);expect(mat.iridescence).toBe(0);mat.dispose();
  });
  it("animates only tagged details and returns to a neutral pose for reduced motion",()=>{
    const root=COLLECTION03_EARRINGS["s33v3-levitation-ear"]();const bindings=collectCollection03Motion([root]);expect(bindings).toHaveLength(1);
    const y=bindings[0].object.position.y;updateCollection03Motion(bindings,1.5,false);expect(bindings[0].object.position.y).toBeCloseTo(y+.025);
    updateCollection03Motion(bindings,1.5,true);expect(bindings[0].object.position.y).toBe(y);disposeObject(root);
  });
  it("rapidly replaces and removes every new item without leaving attached objects",()=>{
    canvas();const p=parts(),rig=createOutfitRig(p);
    for(const item of COLLECTION03_ITEMS){rig.apply({[item.slot]:item.id});rig.sync(.016,false);}
    rig.apply({});expect(p.model.children).toHaveLength(0);expect(p.lookGroup.children).toHaveLength(0);rig.dispose();expect(p.eyeGroup.children).toHaveLength(0);
  });
});
