import * as THREE from "three";

type Binding = { object: THREE.Object3D; kind: string; y: number; z: number; materials: THREE.MeshStandardMaterial[] };
/** Cache only the tagged nodes when an outfit changes. No scene traversal,
 * allocations, layout reads or timers in the animation path. */
export function collectCollection03Motion(objects: THREE.Object3D[]): Binding[] {
  const bindings: Binding[] = [];
  for(const root of objects)root.traverse(object=>{
    const kind=object.userData.collection03Motion;
    if(!kind)return;
    const materials=new Set<THREE.MeshStandardMaterial>();
    if(kind==="pulse")object.traverse(child=>{
      if(child instanceof THREE.Mesh)for(const m of Array.isArray(child.material)?child.material:[child.material])if(m instanceof THREE.MeshStandardMaterial)materials.add(m);
    });
    bindings.push({object,kind,y:object.position.y,z:object.rotation.z,materials:[...materials]});
  });
  return bindings;
}
export function updateCollection03Motion(bindings: Binding[], seconds: number, reduced: boolean) {
  for(const b of bindings){
    const wave=reduced?0:Math.sin(seconds*Math.PI/3);
    if(b.kind==="float")b.object.position.y=b.y+wave*.025;
    if(b.kind==="rotate")b.object.rotation.z=b.z+wave*Math.PI/45;
    if(b.kind==="pulse")for(const m of b.materials)m.emissiveIntensity=reduced?.08:.12-.04*Math.cos(seconds*Math.PI/2);
  }
}
