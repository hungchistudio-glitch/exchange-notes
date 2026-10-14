import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CULTURAL_ITEMS } from '@/lib/shop/culturalCollection';
import { cleanOutfit, itemsFor, ownedOnly, toggleInOutfit, shopItem } from '@/lib/shop/catalog';
import { buildCulturalPiece } from '@/lib/yumi3d/culturalOutfit';
import { buildThumbnailObject, createOutfitRig, disposeObject } from '@/lib/yumi3d/outfit';

afterEach(()=>vi.restoreAllMocks());
function canvas() {
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillRect(){},beginPath(){},ellipse(){},stroke(){},arc(){},fill(){},fillText(){}} as unknown as CanvasRenderingContext2D);
}
describe('cultural accessories',()=>{
  it('keeps jewelry independent of hats, glasses and scarves through storage and ownership filtering',()=>{
    let outfit={head:'beret',eyewear:'monocle',neck:'silk-scarf'};
    for(const id of ['tea-pearl-earrings','fr-signal-brow','pearl-satellite-necklace']) outfit=toggleInOutfit(outfit,shopItem(id)!) as typeof outfit;
    expect(cleanOutfit(outfit)).toEqual(outfit);
    expect(ownedOnly(outfit,new Set(Object.values(outfit)))).toEqual(outfit);
    expect(Object.keys(outfit)).toHaveLength(6);
    expect(itemsFor('jewelry','all',new Set())).toHaveLength(20);
  });
  it('builds finite, bounded geometry for every new item and disposes it',()=>{
    canvas();
    for(const item of CULTURAL_ITEMS) {
      const object=buildThumbnailObject(item.id)!;
      expect(object,item.id).not.toBeNull();
      const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      expect([size.x,size.y,size.z].every(x=>Number.isFinite(x)&&x>0&&x<6),item.id).toBe(true);
      let triangles=0;
      object.traverse(child=>{if(child instanceof THREE.Mesh){triangles+=(child.geometry.index?.count??child.geometry.attributes.position.count)/3;}});
      expect(triangles,item.id).toBeLessThan(15000);
      disposeObject(object);
    }
  });
  it('sells a single earring, with one top loop, one pendant and one connector',()=>{
    for(const item of CULTURAL_ITEMS.filter(item=>item.slot==='earrings')) {
      const piece=buildCulturalPiece(item.id)!;
      expect(piece.children,item.id).toHaveLength(3);
      disposeObject(piece);
    }
  });
  it('does not rebuild unchanged jewelry and removes all meshes when reset',()=>{
    canvas();
    const model=new THREE.Group(),eyeGroup=new THREE.Group(),lookGroup=new THREE.Group();
    const pupil=new THREE.Mesh(),shellMaterial=new THREE.MeshPhysicalMaterial();
    const rig=createOutfitRig({model,eyeGroup,lookGroup,pupil,shellMaterial});
    const outfit={earrings:'tea-pearl-earrings',brow:'fr-signal-brow',necklace:'pearl-satellite-necklace'};
    expect(rig.apply(outfit)).toHaveLength(3);
    expect(rig.apply(outfit)).toHaveLength(0);
    rig.apply({}); expect(model.children).toHaveLength(0);
    expect(eyeGroup.children[0].children).toHaveLength(0);
    rig.dispose(); shellMaterial.dispose();
  });
});
