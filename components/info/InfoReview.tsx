"use client";

import { useEffect, useState } from "react";
import InfoPage, { type InfoPageKind } from "./InfoPage";

/** Development-only layout controls; no stored preference or account writes. */
export default function InfoReview() {
  const [fontSize, setFontSize] = useState("16");
  const [mode, setMode] = useState("standard");
  const [page, setPage] = useState<InfoPageKind>("about");

  useEffect(() => {
    const root = document.documentElement;
    const previousSize = root.style.fontSize;
    const previousMode = root.getAttribute("data-interface-mode");
    const frame = requestAnimationFrame(() => {
      root.style.fontSize = `${fontSize}px`;
      root.setAttribute("data-interface-mode", mode);
    });
    return () => {
      cancelAnimationFrame(frame);
      root.style.fontSize = previousSize;
      if (previousMode === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previousMode);
    };
  }, [fontSize, mode]);

  return <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", padding: "1rem", color: "var(--color-black)", background: "var(--surface)" }}>
      <label>Page <select value={page} onChange={(event) => setPage(event.target.value as InfoPageKind)}>
        <option value="about">About</option><option value="community">Community</option><option value="privacy">Privacy</option>
      </select></label>
      <label>Text size <select value={fontSize} onChange={(event) => setFontSize(event.target.value)}>
        <option value="16">100%</option><option value="19">App large</option><option value="32">200%</option>
      </select></label>
      <label>Theme <select value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="standard">Standard</option><option value="yumi-cosmic">Cosmic</option>
      </select></label>
    </div>
    <InfoPage page={page} publicView />
  </>;
}
