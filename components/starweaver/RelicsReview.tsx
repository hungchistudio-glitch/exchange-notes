"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { STARWEAVER_ITEMS } from "@/lib/shop/starweaverCollection";
import { ARM_ROOT, EYE_REST, buildYumiActor } from "@/lib/yumi3d/actor";
import { createOutfitRig } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

/* =========================================================
   The relics, checked as the design book asks (handoffs/yumi-starweaver/
   DESIGN.md §7): each worn on Yumi and seen from the front (0°), the side
   (90°), the back (180°), the other side (270°) and from 45° above; the
   camera framed on the piece, with enough of her round it to see that it
   sits on her and not through her. Then all of one kind worn together with
   glasses and a scarf, for anything passing through anything.

   One renderer, drawing each view in turn into an image: a grid of live
   canvases would need more WebGL contexts than a browser gives a page.
   ========================================================= */

const VIEWS = [
  { name: "0°", yaw: 0, pitch: 0.12 },
  { name: "90°", yaw: Math.PI / 2, pitch: 0.12 },
  { name: "180°", yaw: Math.PI, pitch: 0.12 },
  { name: "270°", yaw: -Math.PI / 2, pitch: 0.12 },
  { name: "45° ↓", yaw: 0.6, pitch: Math.PI / 4 },
] as const;

const TOGETHER: { name: string; outfit: YumiOutfit }[] = [
  { name: "together A", outfit: { material: "sw-eventide-ceramic", eyewear: "round-glasses", neck: "silk-scarf", earrings: "sw-portal-seed", brow: "sw-zenith-pin", necklace: "sw-weavers-knot", head: "sw-cartographer-diadem" } },
  { name: "together B", outfit: { material: "sw-eclipse-titanium", eyewear: "aviator-shades", neck: "silk-scarf", earrings: "sw-comet-thread", brow: "sw-meridian-cuff", necklace: "sw-seven-gates", head: "sw-aurora-visor" } },
  { name: "together C", outfit: { material: "sw-nebula-opal", eyewear: "round-glasses", earrings: "sw-signal-spiral", brow: "sw-phase-notch", necklace: "sw-stellar-compass" } },
];

type Shot = { label: string; views: { name: string; url: string }[] };

export default function RelicsReview() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const size = 300;
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f4f0);
    scene.environment = makeStudioEnvironment(renderer);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b4a9, 0.6));
    const key = new THREE.DirectionalLight(0xfff8ee, 2.6);
    key.position.set(5, 8, 6);
    scene.add(key);
    const back = new THREE.DirectionalLight(0xffffff, 1);
    back.position.set(-4, 3, -6);
    scene.add(back);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

    const actor = buildYumiActor();
    const { model, arm, armCollar, eyeGroup, lookGroup, pupil, shellMaterial } = actor;
    const toEye = EYE_REST.clone().sub(ARM_ROOT);
    arm.position.copy(ARM_ROOT);
    arm.scale.set(1, toEye.length(), 1);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toEye.clone().normalize());
    armCollar.position.copy(ARM_ROOT);
    scene.add(model);
    const rig = createOutfitRig({ model, eyeGroup, lookGroup, pupil, shellMaterial });

    const shoot = (outfit: YumiOutfit, frameOn: "piece" | "whole") => {
      const pieces = rig.apply(outfit);
      rig.sync(0, true);
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3();
      /* An earring is framed on its drop, not on the hook round her tube. */
      const target = frameOn === "piece" && outfit.earrings && pieces[0]?.children.length ? [pieces[0].children.at(-1)!] : pieces;
      if (frameOn === "piece" && target.length) for (const piece of target) box.expandByObject(piece);
      else box.setFromObject(model);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const radius = frameOn === "piece" ? Math.max(0.32, sphere.radius * 1.35) : sphere.radius * 1.05;
      return VIEWS.map(view => {
        const direction = new THREE.Vector3(
          Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw) * Math.cos(view.pitch),
        );
        camera.position.copy(sphere.center).addScaledVector(direction, radius / Math.sin(THREE.MathUtils.degToRad(15)));
        camera.lookAt(sphere.center);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return { name: view.name, url: canvas.toDataURL("image/jpeg", 0.85) };
      });
    };

    void (async () => {
      const out: Shot[] = [];
      for (const item of STARWEAVER_ITEMS) {
        if (cancelled) return;
        out.push({ label: `${item.seal} ${item.id} (${item.slot})`, views: shoot({ [item.slot]: item.id }, item.slot === "material" ? "whole" : "piece") });
        setShots([...out]);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      for (const set of TOGETHER) {
        if (cancelled) return;
        out.push({ label: set.name, views: shoot(set.outfit, "whole") });
        setShots([...out]);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      setDone(true);
    })();

    return () => {
      cancelled = true;
      rig.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <main style={{ padding: 12, background: "#fff", color: "#222", font: "12px system-ui" }} data-done={done ? "true" : "false"}>
      <h1 style={{ fontSize: 16 }}>Starwoven Relics · five views each{done ? "" : " …"}</h1>
      {shots.map(shot => (
        <section key={shot.label} style={{ marginBottom: 10 }}>
          <p style={{ margin: "4px 0" }}>{shot.label}</p>
          <div style={{ display: "flex", gap: 4 }}>
            {shot.views.map(view => (
              <figure key={view.name} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={view.url} width={150} height={150} alt={`${shot.label} ${view.name}`} />
                <figcaption style={{ textAlign: "center" }}>{view.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
