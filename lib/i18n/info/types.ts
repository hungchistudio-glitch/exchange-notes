export type InfoSection = { title: string; body: string };

export type InfoCopy = {
  nav: { about: string; community: string; privacy: string; contact: string; home: string; back: string; related: string };
  help: { description: string; about: string; community: string; privacy: string };
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
  privacy: { intro: string; status: string; notice: string; sections: [InfoSection, InfoSection, InfoSection, InfoSection, InfoSection, InfoSection, InfoSection, InfoSection]; contact: string };
};
