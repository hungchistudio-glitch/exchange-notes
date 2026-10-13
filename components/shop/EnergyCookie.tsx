/** One bitten wafer and three charge points: readable at price-icon size. */
export default function EnergyCookie({ className }: { className?: string }) {
 return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
  <path d="M14.8 2.7a4 4 0 0 0 5.5 5.5A9.6 9.6 0 1 1 14.8 2.7Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
  <path d="M5.5 15.5a7 7 0 0 0 9.5 3" stroke="currentColor" strokeWidth=".7" opacity=".45" strokeLinecap="round" />
  <circle cx="8" cy="9" r="1.05" fill="currentColor"/><circle cx="12" cy="12" r="1.05" fill="currentColor"/><circle cx="8" cy="15" r="1.05" fill="currentColor"/>
 </svg>;
}
