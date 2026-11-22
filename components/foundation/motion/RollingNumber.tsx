"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import styles from "./RollingNumber.module.css";

/* =========================================================
   A number that rolls into place, as an odometer does
   (Chi, 2026-11-22: 數字跳動)

   Each digit is a strip of 0–9 in a one-line window. It starts at the digit
   the number last showed and turns to its new one on the settle spring,
   the rightmost first, as a counter's wheels do. Transform only.

   When it rolls is the point: a count that rolled every time a page was
   opened would be noise on a screen seen many times a day. So `remember`
   names the number, and it rolls only when it differs from what this tab
   last showed under that name; `fromZero` lets a number count up from 0
   the first time this tab shows it. Reduced motion: the number, still.
   ========================================================= */

const memory = new Map<string, number>();

function readMemory(key: string): number | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    const stored = window.sessionStorage.getItem(`rolling:${key}`);
    return stored === null ? null : Number(stored);
  } catch {
    return null;
  }
}

function writeMemory(key: string, value: number) {
  memory.set(key, value);
  try {
    window.sessionStorage.setItem(`rolling:${key}`, String(value));
  } catch {
    // Private mode: the tab's memory is enough.
  }
}

export default function RollingNumber({
  value,
  locale,
  remember,
  fromZero = false,
  className,
}: {
  value: number;
  locale?: string;
  /** What this number is, so it rolls only when it has changed. */
  remember: string;
  /** Count up from 0 the first time this tab shows it. */
  fromZero?: boolean;
  className?: string;
}) {
  const text = value.toLocaleString(locale);
  /* What each wheel shows: where it starts, then (a frame later) its digit. */
  const [shown, setShown] = useState<string>(text);
  const [rolling, setRolling] = useState(false);
  const first = useRef(true);

  useLayoutEffect(() => {
    const isFirst = first.current;
    first.current = false;
    const last = readMemory(remember);
    writeMemory(remember, value);
    const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = last ?? (fromZero && isFirst ? 0 : null);
    if (still || from === null || from === value) {
      setRolling(false);
      setShown(text);
      return;
    }
    /* Start at the old digits, right-aligned to the new number's wheels. */
    const old = from.toLocaleString(locale).replace(/\D/g, "");
    let index = old.length;
    const start = Array.from(text).reverse().map(char => {
      if (!/\d/.test(char)) return char;
      index -= 1;
      return index >= 0 ? old[index] : "0";
    }).reverse().join("");
    setRolling(false);
    setShown(start);
    let second = 0;
    const firstFrame = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setRolling(true);
        setShown(text);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(second);
    };
  }, [value, text, locale, remember, fromZero]);

  const chars = Array.from(shown.length === text.length ? shown : text);
  const digitsFromRight = (position: number) => chars.slice(position + 1).filter(char => /\d/.test(char)).length;
  return (
    <span className={`${styles.number}${className ? ` ${className}` : ""}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={styles.wheels} data-rolling={rolling ? "true" : undefined}>
        {chars.map((char, position) => /\d/.test(char) ? (
          <span key={position} className={styles.window}>
            <span
              className={styles.strip}
              style={{ "--digit": Number(char), "--wheel": digitsFromRight(position) } as CSSProperties}
            >
              {"0123456789".split("").map(digit => <span key={digit}>{digit}</span>)}
            </span>
            {/* Holds the window's width to the digit it lands on. */}
            <span className={styles.sizer}>{Array.from(text)[position] ?? char}</span>
          </span>
        ) : (
          <span key={position}>{char}</span>
        ))}
      </span>
    </span>
  );
}
