"use client";

import { useSyncExternalStore } from "react";

/* Cosmic or not, read off the page itself: the review screens have no
   preferences provider, and the games' stages must follow a switch made
   anywhere (Settings, the shop) while they are open. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-interface-mode"] });
  return () => observer.disconnect();
}

const isCosmicNow = () => document.documentElement.dataset.interfaceMode === "yumi-cosmic";

/** Whether the interface is in Yumi Cosmic, the app's dark mode. False on the server. */
export default function useCosmicMode() {
  return useSyncExternalStore(subscribe, isCosmicNow, () => false);
}
