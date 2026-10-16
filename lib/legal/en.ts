import type { LegalCopy } from "./types";

const legal: LegalCopy = {
  effective: "Effective {date}",
  privacy: {
    intro:
      "Your notes hold personal experiences and sometimes other people’s stories. This policy explains what Exchange Notes collects, why, who processes it with us, how long it is kept, and the choices you have.",
    summaryTitle: "In short",
    summary: [
      "Exchange Notes is run by Hungchi Studio, an independent studio operated by one person in Taiwan.",
      "From your Google account we receive only your name, email address, profile photo and account ID, and use them only to run your account.",
      "AI features send the relevant text, images or audio to Google Gemini. We use Gemini’s free tier, under which Google may use that content to improve its products and people may review it, so please don’t send anything sensitive.",
      "We don’t sell your data, don’t show ads and don’t use advertising or analytics trackers.",
      "You can delete your account and its data at any time in Settings → Delete account.",
    ],
    sections: [
      {
        title: "Who we are",
        body: [
          "Exchange Notes (the “app”) is operated by Hungchi Studio, an independent studio run by an individual in Taiwan and not a registered company. Hungchi Studio decides how and why the personal data described here is processed and is responsible for it. You can reach us at the address at the end of this page.",
        ],
      },
      {
        title: "What we get from your Google account",
        body: [
          "You sign in with Google. With your permission, Google shares your name, email address, profile photo and a unique Google account identifier with us. We use them only to create and secure your account, show your profile, and keep you signed in.",
          "We never receive your Google password, and we don’t request access to Gmail, Drive, Contacts or any other Google service. We don’t sell Google user data, use it for advertising, or use it to train AI models. You can remove the app’s access at any time from your Google Account’s security settings.",
        ],
      },
      {
        title: "What you create and send",
        body: [
          "Depending on the features you use, we store what you put into the app so it can work and sync across your devices:",
        ],
        points: [
          "Your profile: display name, Exchange ID, profile photo, native and learning languages, and app preferences such as interface language, mode and daily goal.",
          "Notes and vocabulary: words, translations, examples, notes, sources, tags, pictures you save with them, collections and review history.",
          "Messages and sharing: messages, attachments and words you send, notes you share, friend requests and friendships.",
          "Learning and Yumi: pronunciation scores (we keep scores, not recordings), review results, Yumi’s state, energy cookies and the items she wears.",
        ],
      },
      {
        title: "What is collected automatically",
        body: ["A little information is collected as the app runs:"],
        points: [
          "Notification subscriptions: if you turn on reminders, your browser’s push endpoint and keys, the device name and browser type, or your iPhone’s push token, plus your time zone so reminders arrive at a sensible hour.",
          "Widget access: if you connect the home-screen widget, a token we store only in hashed form.",
          "Approximate location: the shop’s sky uses the weather where you are. Our host derives a rough position from your IP address; we round it to about 10 km, use it to fetch the weather and do not store it.",
          "Usage limits and errors: daily counts of AI requests per account, so the shared limit can be enforced, and records of failed AI calls that contain no content from you.",
          "Server logs: our hosting and database providers keep technical logs (such as IP address, browser type and request time) to run and secure the service.",
        ],
        after: [
          "We don’t use advertising cookies, advertising IDs or third-party analytics. Nothing about how you use the app is sent to an analytics provider.",
        ],
      },
      {
        title: "How we use it",
        body: [
          "To provide the app: sign-in, saving and syncing, translation and recognition, reviews, messages, sharing, reminders and the widget. To keep it working and safe: preventing abuse, enforcing usage limits, fixing problems and protecting accounts. To comply with the law.",
          "Where data protection laws such as the GDPR apply, we rely on performing our agreement with you (providing the features you use), our legitimate interests (keeping the service secure and working), your consent (notifications and device permissions, which you can withdraw), and legal obligations.",
        ],
      },
      {
        title: "AI features and Google Gemini",
        body: [
          "Features such as recognising objects and menus, translating, explaining words, notes and messages, voice lookup and Yumi’s interpretations send the relevant text, note context, image or audio from our server to Google’s Gemini API. Some camera recognition runs entirely on your device and sends nothing. Speech recognition in your browser or operating system may be handled by Apple, Google or another provider under their own terms.",
          "Exchange Notes currently uses Gemini’s unpaid tier. Under Google’s terms for unpaid services, Google may use the content it receives, and the responses it generates, to provide, improve and develop its products and machine-learning technologies, and human reviewers may read, annotate and process it. Please don’t send sensitive information — such as health details, identity documents, passwords, financial data or private details about other people — to AI features.",
          "AI results can be wrong. Treat translations, recognitions and cultural interpretations as suggestions, not facts.",
        ],
      },
      {
        title: "Service providers",
        body: [
          "We use these providers to run the app. Each processes data under its own terms and only for the purpose described:",
        ],
        points: [
          "Supabase — accounts, database and file storage (servers in Canada).",
          "Vercel — hosting and server functions (servers mainly in the United States, with a global network).",
          "Google — Sign-In, the Gemini API, web fonts, and an on-device image model downloaded from Google’s servers.",
          "MyMemory (Translated, Italy) and the Free Dictionary API — the single word or short phrase being looked up, sent from our server, for some translations and pronunciations.",
          "Open-Meteo — rounded coordinates only, for the shop’s weather.",
          "Apple, Google and Mozilla push services — to deliver the notifications you turn on.",
        ],
      },
      {
        title: "Who can see what",
        body: [
          "Other signed-in people can find your public profile — display name, Exchange ID, profile photo and languages — so they can add you as a friend. Messages, shared notes and shared words are visible to the people you send them to, who may keep copies or screenshots. Profile photos are stored at public web addresses so friends’ devices can show them; anyone who has the link can view the photo.",
          "We don’t sell or rent personal data. We disclose it only to the providers above, when required by law or to protect people’s safety, or, if the app is ever transferred to a new operator, to that operator under this policy, with notice to you.",
        ],
      },
      {
        title: "International processing",
        body: [
          "We operate from Taiwan and our providers process data in Canada, the United States and other countries where they have facilities. Those countries may have different data protection laws from yours. We rely on our providers’ contractual data protection commitments, including standard contractual clauses where they apply.",
        ],
      },
      {
        title: "How long we keep it",
        points: [
          "Your account and content: until you delete them or your account.",
          "When you delete your account: your profile, content, messages you sent, friendships, files and Yumi are deleted from our active database and storage straight away. Copies may remain in our provider’s encrypted backups for a short time, normally no longer than 30 days, before they are overwritten.",
          "Shared caches of word translations and pronunciations are kept to speed up lookups; they are stored by word, not by person.",
          "Server logs are kept by our providers for short periods under their own retention settings.",
          "Content sent to Gemini is retained by Google under its own terms.",
        ],
        after: [
          "We don’t currently delete inactive accounts automatically. If that changes, we will tell you first.",
        ],
      },
      {
        title: "Your choices and rights",
        body: [
          "You can edit your profile, delete individual notes, words and messages, stop sharing, turn notifications off and change camera, microphone and notification permissions at any time. You can delete your whole account in Settings → Delete account.",
          "Depending on where you live, you may also have the right to access your data, get a portable copy, correct it, delete it, restrict or object to its processing, and withdraw consent. In Taiwan, the Personal Data Protection Act gives you the right to inquire about, review, copy, supplement or correct your data, and to ask us to stop collecting, processing or using it, or to delete it. Email us to make a request; we will answer within 30 days and may need to confirm it is you. You may also complain to your local data protection authority.",
          "We don’t sell or share personal information for cross-context behavioural advertising.",
        ],
      },
      {
        title: "Age",
        body: [
          "Exchange Notes is for people aged 18 and over, because our AI provider’s terms do not allow services directed at or likely to be used by anyone younger. We don’t knowingly collect data from anyone under 18. If you believe someone under 18 has an account, contact us and we will delete it.",
        ],
      },
      {
        title: "Security",
        body: [
          "Connections are encrypted with HTTPS. Database rules limit every account to its own data and to what others have shared with it, pictures saved with your words are kept in private storage, and the keys that can bypass those rules are held only on our server. Some of your notes and words are also kept on your device for offline use and are cleared when you sign out.",
          "No online service is perfectly secure. Please don’t store passwords, identity documents or other sensitive information in the app. If we learn of a breach affecting your data, we will notify you and the relevant authorities as the law requires.",
        ],
      },
      {
        title: "Cookies and local storage",
        body: [
          "We use only what the app needs to work: sign-in cookies, your language and display preferences, and offline copies of your content on your device. None are used for advertising or cross-site tracking.",
        ],
      },
      {
        title: "Changes to this policy",
        body: [
          "When we change this policy we will update the date at the top. If a change materially affects how your data is used, we will tell you in the app or by email before it takes effect and, where the law requires, ask for your consent.",
        ],
      },
    ],
    contact: "Questions, requests about your data, or concerns? Write to Hungchi Studio:",
  },
  terms: {
    intro:
      "These terms are the agreement between you and Hungchi Studio for using Exchange Notes. Please read them together with the Privacy Policy and the Community & Safety principles.",
    summaryTitle: "In short",
    summary: [
      "You need to be 18 or older and sign in with your own Google account.",
      "What you write stays yours. You let us store and process it only to run the app for you.",
      "AI results can be wrong and are not professional advice.",
      "Energy cookies and shop items are free, virtual and have no money value.",
      "The app is in beta and provided as is. Taiwanese law applies.",
    ],
    sections: [
      {
        title: "About these terms",
        body: [
          "Exchange Notes (the “app”) is provided by Hungchi Studio, an independent studio run by an individual in Taiwan (“we”, “us”). By creating an account or using the app, you agree to these terms. If you don’t agree, please don’t use the app.",
        ],
      },
      {
        title: "Who can use it",
        body: [
          "You must be at least 18 years old and able to form a binding contract. You sign in with your own Google account, and you are responsible for activity on your account and for keeping your Google account secure. Tell us promptly if you think someone else is using your account.",
        ],
      },
      {
        title: "The service",
        body: [
          "Exchange Notes is currently free and in beta. Features may change, be limited — for example, AI features share a daily limit across everyone — or be discontinued, and the app may sometimes be unavailable. We will try to give reasonable notice of major changes, and before shutting the service down we will give you a chance to save your notes.",
        ],
      },
      {
        title: "Your content",
        body: [
          "You keep ownership of everything you create or upload. You give us a worldwide, non-exclusive, royalty-free licence to host, store, copy, process, translate and display it only as needed to run the app for you — including sending it to the service providers described in the Privacy Policy, such as Google Gemini, and showing it to the people you choose to share it with. This licence ends when you delete the content or your account, except for copies other people have already saved and for backups kept for a limited time.",
          "You are responsible for your content and confirm that you have the right to share it, including quotations, photographs and anything about other people.",
        ],
      },
      {
        title: "Acceptable use",
        body: ["Follow the Community & Safety principles. In particular, don’t:"],
        points: [
          "break the law or infringe anyone’s rights, including copyright and privacy;",
          "harass, threaten, impersonate or deceive others, or promote hatred or violence;",
          "share sexual content involving minors, which we report to the authorities;",
          "send spam, malware or unsolicited advertising;",
          "access other people’s data, probe or bypass security or usage limits, or overload the service;",
          "scrape, copy or resell the app or its content with automated tools, or use it to build a competing AI model.",
        ],
      },
      {
        title: "AI features",
        body: [
          "Recognitions, translations, explanations and Yumi’s interpretations are generated automatically and can be inaccurate, incomplete or culturally off. They are not medical, legal, financial, dietary or other professional advice. Menu recognition cannot confirm ingredients or allergens — always ask the restaurant. Check anything important with a reliable source, and don’t submit sensitive information to AI features.",
        ],
      },
      {
        title: "Yumi, energy cookies and the shop",
        body: [
          "Energy cookies are earned by learning and spent on items for Yumi. They and the items are virtual, have no monetary value, cannot be exchanged for money, sold or transferred, and are not your property. We may adjust balances to fix errors or abuse. Nothing can be bought with real money today; if paid items are ever offered, the price and any extra terms will be shown before you pay.",
        ],
      },
      {
        title: "Our rights",
        body: [
          "The app, its design and code, the Exchange Notes name and logo and the Yumi character belong to Hungchi Studio, except for third-party components used under their own licences. These terms don’t give you any right to use our name, logo or Yumi except as part of using the app.",
        ],
      },
      {
        title: "Other services and links",
        body: [
          "The app links to news sources and relies on services such as Google. Their content and services are governed by their own terms and policies, and we are not responsible for them.",
        ],
      },
      {
        title: "Ending your use",
        body: [
          "You can stop using the app and delete your account at any time in Settings → Delete account. We may suspend or close an account that seriously or repeatedly breaks these terms, or when the law requires it. Where reasonable, we will tell you why and give you a chance to respond.",
        ],
      },
      {
        title: "Disclaimer",
        body: [
          "To the extent the law allows, the app is provided “as is” and “as available”, without warranties of any kind, including that it will be uninterrupted, error-free or fit for a particular purpose.",
        ],
      },
      {
        title: "Limitation of liability",
        body: [
          "To the extent the law allows, Hungchi Studio is not liable for indirect, incidental or consequential losses, or for loss of data, profits or goodwill, arising from your use of the app. Nothing in these terms limits liability that cannot be limited by law, such as for intent or gross negligence, or your rights as a consumer under the mandatory laws of the place where you live.",
        ],
      },
      {
        title: "Changes to these terms",
        body: [
          "We may update these terms. We will change the date at the top and, for material changes, tell you in the app or by email before they take effect. If you keep using the app after that, the updated terms apply; if you don’t agree, you can delete your account.",
        ],
      },
      {
        title: "Governing law",
        body: [
          "These terms are governed by the laws of Taiwan (Republic of China). Disputes will be heard by a competent court in Taiwan, unless the mandatory laws of the place where you live as a consumer give you the right to bring proceedings there.",
        ],
      },
    ],
    contact: "Questions about these terms? Write to Hungchi Studio:",
  },
};

export default legal;
