type Lease = { value: string; priority: string; holders: Map<symbol, string> };
const elements = new WeakMap<HTMLElement, Map<string, Lease>>();

/** Overlapping keyboard and sheet locks can finish in either order. */
export function leaseInlineStyles(element: HTMLElement, values: Record<string, string>): () => void {
  let properties = elements.get(element);
  if (!properties) { properties = new Map(); elements.set(element, properties); }
  const token = Symbol();
  for (const [name, value] of Object.entries(values)) {
    let lease = properties.get(name);
    if (!lease) {
      lease = { value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name), holders: new Map() };
      properties.set(name, lease);
    }
    lease.holders.set(token, value);
    element.style.setProperty(name, value);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const name of Object.keys(values)) {
      const lease = properties!.get(name)!;
      lease.holders.delete(token);
      const active = [...lease.holders.values()].at(-1);
      if (active !== undefined) element.style.setProperty(name, active);
      else {
        if (lease.value) element.style.setProperty(name, lease.value, lease.priority);
        else element.style.removeProperty(name);
        properties!.delete(name);
      }
    }
    if (properties!.size === 0) elements.delete(element);
  };
}
