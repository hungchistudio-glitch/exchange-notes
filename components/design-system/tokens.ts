export const ui = {
  colors: {
    page: "bg-[#F6F5F2]",
    surface: "bg-white",
    mutedSurface: "bg-[#ECEAE4]",
    border: "border-black/[0.07]",
  },

  radius: {
    card: "rounded-[24px]",
    control: "rounded-full",
  },

  shadow: {
    card: "shadow-[0_8px_22px_rgba(0,0,0,0.045)]",
    hover: "hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]",
  },

  typography: {
    pageTitle:
      "font-sans text-[28px] font-semibold tracking-[-0.02em] text-black",
    sectionTitle:
      "font-sans text-[20px] font-semibold tracking-[-0.02em] text-black",
    cardTitle:
      "font-sans text-[18px] font-semibold tracking-[-0.02em] text-black",
    body:
      "font-sans text-[15px] font-normal leading-6 tracking-[-0.01em] text-black/75",
    caption:
      "font-sans text-[11px] font-medium tracking-[-0.01em] text-black/40",
    label:
      "font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/40",
  },
} as const;

export function cn(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}
