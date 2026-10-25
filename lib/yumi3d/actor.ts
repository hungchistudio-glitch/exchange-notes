import * as THREE from "three";

import {
  ARM_RADIUS, EYE_RADIUS, GAP_HALF, SHELL_DEPTH, SHELL_RADIUS, TUBE_RADIUS,
} from "./anatomy";

/* =========================================================
   Yumi herself: her shell (YU), her arm and her eye (MI)

   The one place she is built. createYumiScene (home, shop, the landing
   page) puts her on its stage and moves her; Hangyumi's studio hangs the
   same three parts on a gallows, one per wrong guess. Two copies of her
   outline would drift, so neither scene builds its own.

   Moved verbatim from scene.ts on 2026-10-25; the comments are the ones
   that lived there.
   ========================================================= */

/** Where the arm meets the inside of the C, in her own space. */
export const ARM_ROOT = new THREE.Vector3(-SHELL_RADIUS, 0, 0);
/** Where the eye rests when nobody is pulling it. */
export const EYE_REST = new THREE.Vector3(0.1, 0, 0.05);

export function buildYumiActor() {
  // ----------------------------------------------------------- materials
  /* Physical rather than standard so a shop finish can add a clear coat
     (enamel, lacquer, porcelain). With none, it renders as it always has. */
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x040507, metalness: 0.5, roughness: 0.4, envMapIntensity: 0.38,
    transparent: true, opacity: 1,
  });
  const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d9399, metalness: 0.95, roughness: 0.23, envMapIntensity: 0.95,
    transparent: true, opacity: 1,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f0e8, metalness: 0.03, roughness: 0.2,
    emissive: 0xf2f0e8, emissiveIntensity: 0,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000, metalness: 0.15, roughness: 0.07, envMapIntensity: 0.5,
  });
  const bezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x030405, metalness: 0.5, roughness: 0.26, envMapIntensity: 0.6,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fa79a, metalness: 0.35, roughness: 0.3,
    transparent: true, opacity: 1,
  });
  /* The eye is not in this list. It is lit and present from the film's first
     frame and the shell condenses around it — the single-eye boot. */
  const fadeMaterials = [shellMaterial, silverMaterial, accentMaterial];

  // ------------------------------------------------------------ geometry
  const model = new THREE.Group();
  model.rotation.order = "YXZ";

  /* YU (the shell) and MI (the band and the eye) each have a group of their
     own. Together, both are identity and change nothing; see setParts. */
  const yuGroup = new THREE.Group();
  const miGroup = new THREE.Group();
  model.add(yuGroup, miGroup);

  const shell = new THREE.Mesh(
    new THREE.TorusGeometry(SHELL_RADIUS, TUBE_RADIUS, 28, 200, Math.PI * 2 - GAP_HALF * 2),
    shellMaterial,
  );
  shell.rotation.z = GAP_HALF;
  shell.scale.z = SHELL_DEPTH;
  yuGroup.add(shell);

  for (const angle of [GAP_HALF, -GAP_HALF]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TUBE_RADIUS, 28, 18), shellMaterial);
    cap.position.set(Math.cos(angle) * SHELL_RADIUS, Math.sin(angle) * SHELL_RADIUS, 0);
    cap.scale.z = SHELL_DEPTH;
    yuGroup.add(cap);
  }

  /*
   * The arm runs from the C's spine into the centre and holds the eye —
   * the middle stroke of an E, not a stalk hanging off the outside.
   * Modelled with its origin at the root and its length along +Y so a
   * lookAt plus a scale is the whole rig.
   */
  const armGeometry = new THREE.CylinderGeometry(ARM_RADIUS, ARM_RADIUS, 1, 40, 1, true);
  armGeometry.translate(0, 0.5, 0);
  const arm = new THREE.Mesh(armGeometry, silverMaterial);
  arm.position.copy(ARM_ROOT);
  miGroup.add(arm);

  const armCollar = new THREE.Mesh(new THREE.SphereGeometry(ARM_RADIUS * 1.5, 24, 16), silverMaterial);
  armCollar.position.copy(ARM_ROOT);
  miGroup.add(armCollar);

  const eyeGroup = new THREE.Group();
  eyeGroup.position.copy(EYE_REST);
  miGroup.add(eyeGroup);

  const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(EYE_RADIUS, 56, 36), eyeMaterial);

  /* Generous, invisible, and low-poly: this is the thing a finger has to
     find, and a finger is not precise. */
  const eyeHit = new THREE.Mesh(
    new THREE.SphereGeometry(EYE_RADIUS * 1.45, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  eyeGroup.add(eyeHit);

  /* Between the eye and its parts, so a blink squashes the whole assembly
     along the screen's vertical whichever way she happens to be turned. */
  const blinkPivot = new THREE.Group();
  eyeGroup.add(blinkPivot);
  blinkPivot.add(eyeBall);

  const lookGroup = new THREE.Group();
  blinkPivot.add(lookGroup);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 26), pupilMaterial);
  pupil.position.set(0, 0, EYE_RADIUS * 0.74);
  lookGroup.add(pupil);

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 18, 72), bezelMaterial);
  bezel.position.set(0, 0, EYE_RADIUS * 0.7);
  lookGroup.add(bezel);

  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 14), highlightMaterial);
  highlight.position.set(-0.17, 0.19, EYE_RADIUS * 0.95);
  lookGroup.add(highlight);

  for (const position of [
    new THREE.Vector3(Math.cos(GAP_HALF) * SHELL_RADIUS, Math.sin(GAP_HALF) * SHELL_RADIUS, TUBE_RADIUS * SHELL_DEPTH * 0.55),
    new THREE.Vector3(Math.cos(-GAP_HALF) * SHELL_RADIUS, Math.sin(-GAP_HALF) * SHELL_RADIUS, TUBE_RADIUS * SHELL_DEPTH * 0.55),
    new THREE.Vector3(-SHELL_RADIUS + TUBE_RADIUS, 0, 0),
  ]) {
    const seam = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 14), accentMaterial);
    seam.position.copy(position);
    yuGroup.add(seam);
  }

  return {
    model, yuGroup, miGroup, shell, arm, armCollar, eyeGroup, eyeBall, eyeHit,
    blinkPivot, lookGroup, pupil, bezel, highlight,
    shellMaterial, silverMaterial, eyeMaterial, pupilMaterial, bezelMaterial,
    highlightMaterial, accentMaterial, fadeMaterials,
  };
}

export type YumiActor = ReturnType<typeof buildYumiActor>;
