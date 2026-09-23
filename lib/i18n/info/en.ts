import type { InfoCopy } from "./types";

const info: InfoCopy = {
  nav: { about: "About Exchange Notes", community: "Community & safety", privacy: "Privacy information", contact: "Contact us", home: "Back to home", back: "Back to Help & About", related: "Keep exploring" },
  help: { description: "Explore the ideas behind Exchange Notes, our principles for sharing, and how data is handled. You can also take the tour again.", about: "Exchange a phrase. Discover another way of seeing.", community: "Stay curious. Respect each other’s boundaries.", privacy: "Understand your data, AI services, and choices" },
  about: {
    tagline: "Exchange a phrase. Discover another way of seeing.",
    greeting: "Hi, I’m Yumi. Every phrase that stays with you has a story. Let’s explore it together—and listen to how others understand it.",
    storyTitle: "Why Exchange Notes exists",
    story: [
      "Some words find us on a journey. Others only make sense as we grow. They carry the places, relationships, and feelings of that moment, long after it has passed.",
      "I created Exchange Notes to help keep those moments. Save a phrase, the context around it, and what it means to you. When someone from another country, generation, or culture encounters those same words, they may recall a different story or see a different meaning. Every interpretation comes from somewhere.",
      "I want language learning to begin with that curiosity: understanding the words, hearing the tone, and getting closer to the person speaking. Each exchange can be a chance to discover the world—and yourself.",
    ],
    featuresTitle: "Let everyday life become a place to learn",
    features: [
      { title: "Understand what’s in front of you", body: "Identify objects with your camera and read menus. Turn the things you encounter on your travels into learning material." },
      { title: "Find the words you need", body: "Use text input, speech recognition, and translation to practice expressing yourself and explore possible tones and cultural contexts." },
      { title: "Keep your curiosity", body: "Explore the world through Discovery news, capture words you want to learn, and save and review them in your own language notebook." },
    ],
    ai: { title: "Learn with AI. Keep your own judgment.", body: "AI helps identify, translate, and organize, so you can start understanding and practicing sooner. Yumi is your AI learning companion. Its cultural interpretations are suggestions: they can be wrong and cannot determine anyone’s true intentions. When meaning is unclear, asking another question is part of learning." },
    closing: "Turn the world you encounter into notes you can exchange.",
    planet: "Primary service planet: Earth.",
  },
  community: {
    intro: "Every story deserves respect. Help make Exchange Notes a place where people can ask, share, and learn with care.",
    rules: [
      { title: "Respect differences", body: "Respect languages, accents, identities, and cultures. Share your experience without treating one person’s view as the voice of an entire group." },
      { title: "Share what you have the right to share", body: "Respect copyright and privacy. Keep the source when quoting news. Get appropriate consent before recording, photographing, or sharing someone else’s conversations or identifying information." },
      { title: "Do not harm or exploit others", body: "Do not harass, threaten, promote hate, scam, impersonate, expose private information, or distribute content involving child sexual exploitation or incitement to violence." },
      { title: "Distinguish facts from interpretations", body: "Personal feelings, news reports, and AI guesses are different things. Do not treat translations, summaries, or cultural interpretations as verified facts. Check the original and its source before sharing." },
      { title: "Protect yourself and others", body: "Do not submit passwords, identity documents, payment details, or private content you are not authorized to share. Stop interacting and contact us if someone asks for money, verification codes, or intimate images." },
      { title: "Check important decisions twice", body: "Menu recognition cannot guarantee complete ingredient or allergen information; ask the restaurant. For medical, legal, personal safety, or other significant decisions, consult an appropriate professional or official source." },
    ],
    contact: "Email us about harmful content or problems with an exchange. Describe what happened without including unnecessary private information.",
  },
  privacy: {
    intro: "Your notes hold personal experiences and may include other people’s stories. This page explains the data handling involved in current features and the choices available to you.",
    status: "Pre-publication draft",
    notice: "This is draft privacy information, not a finalized, complete privacy policy. The operator’s legal details, service regions, retention periods, deletion procedures, minimum age, and AI provider plan still need confirmation. These details and an effective date will be added before the policy is finalized for publication.",
    sections: [
      { title: "The data we process", body: "Depending on the features you use, Exchange Notes processes account and language preferences, notes, vocabulary, messages, learning records, and text, images, or audio you submit. This supports sign-in, saving, sync, exchanges, recognition, and translation. Enabling reminders or device connections also involves the relevant subscription and connection information." },
      { title: "AI and other service providers", body: "Some features use Google Gemini and send relevant text, note context, images, or audio to that provider. Accounts and cloud data use Supabase. Speech recognition may also use browser or operating-system providers and should not be assumed to run only on your device. AI retention, model-improvement, and human-review conditions still need to be confirmed against the actual service plan." },
      { title: "Sharing and external links", body: "When you send a message or share a note, recipients can see its content and associated profile information according to the feature’s permissions. They may keep copies or screenshots; revoking access cannot guarantee recovery of existing copies. External sites, including original Discovery news sources, handle data under their own policies." },
      { title: "Permissions and local storage", body: "Cookies and local storage support sign-in, language, interface preferences, and caches. You can adjust camera, microphone, and notification permissions in your device or browser settings. Revoking permission can affect those features but does not automatically delete content already submitted. Signing out or uninstalling does not delete a cloud account." },
      { title: "Retention and deletion", body: "Retention and deletion schedules for accounts, notes, attachments, AI content, logs, and backups are still being confirmed. We cannot promise immediate deletion or zero retention. You can email us below to request data or account deletion; handling depends on the data involved, recipient copies, and applicable law." },
      { title: "Your rights", body: "Depending on your location and applicable law, you may have rights to access, correct, delete, or obtain a portable copy of data, restrict or object to processing, and withdraw consent. Contact us below; appropriate identity verification may be needed. You may also complain to a data protection authority with jurisdiction." },
      { title: "Service regions and data security", body: "We aim to serve people across countries and regions. Availability depends on distribution regions, provider support, and applicable law. Data may be processed across borders; specific locations and safeguards still need confirmation. No online service can promise absolute security. Please avoid submitting unnecessary sensitive information." },
      { title: "Eligibility and future updates", body: "Minimum age and eligibility rules must still be confirmed against service markets and AI provider conditions; this page does not mean the service is suitable for all ages. The final policy will add operator details, processing grounds, the full provider information, and update procedures. Significant changes will be notified, with consent obtained where required." },
    ],
    contact: "For privacy questions, data-rights requests, or deletion requests, contact:",
  },
};
export default info;
