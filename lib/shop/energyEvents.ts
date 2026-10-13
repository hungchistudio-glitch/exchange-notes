export const ENERGY_REFRESH_EVENT = 'yumi-energy-refresh';
export function refreshEnergyRewards() {
 if (typeof window !== 'undefined') window.dispatchEvent(new Event(ENERGY_REFRESH_EVENT));
}
