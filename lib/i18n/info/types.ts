export type InfoSection = { title: string; body: string };

export type InfoCopy = {
  nav: { about: string; community: string; privacy: string; terms: string; contact: string; home: string; back: string; related: string };
  help: { description: string; about: string; community: string; privacy: string; terms: string };
  about: {
    tagline: string;
    greeting: string;
    storyTitle: string;
    story: [string, string, string];
    featuresTitle: string;
    features: [InfoSection, InfoSection, InfoSection];
    ai: InfoSection;
    closing: string;
    planet: string;
  };
  community: { intro: string; rules: [InfoSection, InfoSection, InfoSection, InfoSection, InfoSection, InfoSection]; contact: string };
  /* The privacy policy and terms themselves live in lib/legal, loaded only
     by the two pages that show them; see lib/legal/types.ts. */
};
