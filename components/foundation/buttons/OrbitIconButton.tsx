"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "@/components/foundation/buttons/OrbitIconButton.module.css";

type OrbitIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The icon itself. Sizing stays with the caller, since a button in a
   *  message bubble and one under a lookup card are not the same size. */
  children: ReactNode;
  /** Tailwind sizing for the button box, e.g. "h-12 w-12". */
  sizeClassName: string;
};

/**
 * An icon button wearing the app's own orbital language.
 *
 * The icons have carried it from the start — NavHomeIcon is a core inside a
 * half-open ring, NavDiscoverIcon is a scanner sweep — while the buttons
 * holding icons were plain bordered circles. Two arcs turn around the icon at
 * different speeds in opposite directions, which is what keeps it from reading
 * as one spinning wheel, and a press throws a short halo.
 *
 * `aria-label` is the caller's job, as with any icon-only control.
 */
export default function OrbitIconButton({
  children,
  sizeClassName,
  className = "",
  type = "button",
  ...props
}: OrbitIconButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${sizeClassName} ${className}`.trim()}
      {...props}
    >
      <span aria-hidden="true" className={styles.orbit} />
      <span aria-hidden="true" className={styles.orbitInner} />
      <span className={styles.icon}>{children}</span>
    </button>
  );
}
