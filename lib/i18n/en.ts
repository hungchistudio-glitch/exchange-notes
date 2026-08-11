import type { TranslationDictionary } from "@/lib/i18n/types";

const english: TranslationDictionary = {
  pwa: {
    title: "Exchange Notes is ready",
    subtitle:
      "Add Exchange Notes to your Home Screen for faster access, notifications and a full-screen experience.",
    benefitInstantTitle: "Open instantly",
    benefitInstantDescription: "Launch Exchange Notes directly from your Home Screen.",
    benefitConnectedTitle: "Stay connected",
    benefitConnectedDescription: "Receive learning and message notifications.",
    benefitAnywhereTitle: "Learn anywhere",
    benefitAnywhereDescription:
      "Keep essential parts of the app available during unstable connections.",
    installCta: "Install Exchange Notes",
    maybeLater: "Maybe later",
    gotIt: "Got it",
    iosStepsTitle: "Add to Home Screen",
    iosStep1: "Tap the Share button in Safari.",
    iosStep2: "Choose “Add to Home Screen.”",
    iosStep3: "Turn on “Open as Web App.”",
    iosStep4: "Tap “Add.”",
    settingsRowTitle: "Install Exchange Notes",
    settingsRowDescription: "Add the app to your Home Screen",
    installedRowTitle: "Exchange Notes is installed",
    updateReadyTitle: "A new version is ready",
    updateReadyAction: "Reload",
    updateReadyDismiss: "Not now",
  },
  onboarding: {
    back: "Back",
    continue: "Continue",
    welcome: {
      title: "Welcome to Exchange Notes",
      subtitle: "Let's personalize your learning experience.",
      cta: "Get started",
    },
    name: {
      title: "What should we call you?",
      displayNameLabel: "Display name",
      displayNamePlaceholder: "Your name",
      usernameLabel: "Username",
      usernamePlaceholder: "yourname",
      usernameHint: "Used for friends to find you, your QR code, and Messages.",
      checkingAvailability: "Checking availability…",
      idAvailable: "Username is available",
      idTaken: "This username is already taken",
      idCheckError: "Couldn't check availability. Try again.",
      addPhoto: "Add photo",
      changePhoto: "Change photo",
      photoImageError: "Please choose an image file.",
      photoSizeError: "Photo must be smaller than 5MB.",
      photoUploadError: "Could not upload photo. Please try again.",
      saveError: "Could not save your name. Please try again.",
    },
    appLanguage: {
      title: "Choose your app language",
      subtitle: "This changes menus, buttons and instructions.",
      note: "App language only controls the interface — it doesn't change what's primary in your word cards.",
    },
    languages: {
      title: "Which language do you want to learn?",
      nativeLabel: "I already know",
      nativeDescription: "Used for translations and explanations.",
      learningLabel: "I'm learning",
      learningDescription: "This becomes the main focus of words, news and pronunciation practice.",
      previewPrimary: "{language} will be the main content in your word cards and news.",
      previewSecondary: "{language} will appear as the translation and explanation.",
      sameLanguageHint: "Please choose a learning language different from your native language.",
      completeError: "Could not save your language preferences. Please try again.",
    },
    confirm: {
      title: "Everything looks good",
      nameLabel: "Name",
      appLanguageLabel: "App language",
      nativeLabelSummary: "Native language",
      learningLabelSummary: "Learning language",
      note: "You can change these anytime in Settings.",
      cta: "Start learning",
    },
  },
  common: {
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    saving: "Saving…",
    delete: "Delete",
    edit: "Edit",
    share: "Share",
    send: "Send",
    source: "Source",
    loading: "Loading…",
    error: "Something went wrong",
  },

  auth: {
    language: {
      eyebrow: "Exchange Notes",
      title: "Choose your language",
      subtitle: "Select the language used throughout the app.",
      englishTitle: "English",
      englishDescription: "Use Exchange Notes in English",
      traditionalChineseDescription: "Use Exchange Notes in Traditional Chinese",
      continue: "Continue",
    },

    login: {
      eyebrow: "English × Traditional Chinese",
      title: "Exchange Notes",
      subtitle: "Log in to your private learning space.",
      googleSubtitle:
        "Learn languages naturally through real conversations and everyday life.",
      consentNotice:
        "By continuing, you agree to securely sign in with your Google account.",
      googleSubmit: "Continue with Google",
      googleSubmitting: "Connecting…",
      email: "Email",
      genericError: "Could not log in. Please try again.",
    },
  },

  tutorial: {
    rowTitle: "How to use Exchange Notes",
    rowDescription: "Yumi shows you around",
    rowValue: "Tour",
    homeButton: "Yumi can show you around",
    open: "Show me around",
    skip: "Skip for now",
    back: "Back",
    next: "Next",
    finish: "Start learning",
    close: "Close",
    stepLabel: "{current} of {total}",
    replay: "You can reopen this any time from Home or Settings.",

    steps: {
      meet: {
        title: "Hello — I'm Yumi",
        body:
          "I live in this app, and I am learning the same way you are: one new thing at a time. Let me walk you through what everything does. It takes about a minute.",
      },
      setup: {
        title: "Two languages, first",
        body:
          "One is the language I speak to you in. The other is the one you came here to learn. Pick them now and the rest of this tour arrives in your language.",
        appLanguageLabel: "Talk to me in",
        learningLabel: "I'm here to learn",
        note: "Both can be changed later in Settings.",
        saveError: "I couldn't save that. Try again in a moment.",
      },
      name: {
        title: "yu and mi",
        body:
          "Exchange Notes is really two people. yu is you. mi is me. You write down a word in your language, I write one down in mine, and we trade. That trade is the whole app — we each end up fluent in the other's mother tongue.",
      },
      senses: {
        title: "The first time counts",
        body:
          "A word stays with you because of how you first met it — the feel of the thing, the look of it, the sound, even what the air smelled like. I keep those first meetings safe for you. Coming back to them, a little each day, is where patience quietly turns into fluency.",
      },
      home: {
        title: "Home is where I wait",
        body:
          "This is where I am. You'll see today's focus, the word I picked for you, and a place to jot a quick note. Feed me a cookie when you finish a review and I'll be very pleased with you.",
      },
      vocabulary: {
        title: "Everything you've collected",
        body:
          "Every word you save lands here, grouped into collections. Words you're about to forget rise to the top for review — that's the part that makes them stick.",
      },
      capture: {
        title: "Point at anything",
        body:
          "Tap the camera and show me something in front of you. I'll tell you what it is in both languages, with an example sentence you can actually say. This is the fastest way to your first word.",
        action: "Add my first word this way",
      },
      discover: {
        title: "Today's stories",
        body:
          "Real news, rewritten so you can read it at your level. Tap any word you don't know and I'll save it for you. This is the other good way to get your first word.",
        action: "Find my first word in a story",
      },
      messages: {
        title: "Where the exchange happens",
        body:
          "Send a word to your learning partner and they'll get the card, with pronunciation. When they send one back in their language, that's the exchange working exactly as it should.",
      },
      friends: {
        title: "Bring someone with you",
        body:
          "Add a partner by their Exchange ID, or let them scan your QR code. Learning a language alone is hard; learning it with someone who needs yours is much easier.",
        action: "Add my first partner",
      },
      settings: {
        title: "Make it yours",
        body:
          "Settings holds your name and photo, your daily goal, the widget, and the two language controls: which language the app itself speaks, and which one you're here to learn. Change either whenever you like.",
        action: "Open Settings",
      },
      done: {
        title: "That's everything",
        body:
          "Start with one word today. That's genuinely enough — the app is built so that one word a day beats an hour once a month. I'll be on the home screen when you're ready.",
      },
    },
  },

  navigation: {
    vocabulary: "Vocabulary",
    messages: "Messages",
    home: "Home",
    discover: "Discover",
    settings: "Settings",
    primaryLabel: "Primary navigation",
  },

  cosmic: {
    modeName: "Yumi Cosmic Mode",
    deck: {
      eyebrow: "Command Deck",
      title: "Yumi Command Deck",
      subtitle: "Every system online. Pick where to go.",
      coreLabel: "Yumi core",
      dockLabel: "Cosmic navigation",
      roomsLabel: "Command controls",
      readoutLexicon: "Lexicon",
      readoutDue: "Due",
      readoutLearning: "Learning",
      languageEnglish: "English",
      languageChinese: "Chinese",
    },
    rooms: {
      lexicon: {
        name: "Lexicon Core",
        familiar: "Vocabulary",
        description: "Your saved words and collections",
      },
      mission: {
        name: "Mission Control",
        familiar: "Review",
        description: "Today's words to practise",
      },
      scanner: {
        name: "Scanner Bay",
        familiar: "Camera",
        description: "Point at anything and learn it",
      },
      comms: {
        name: "Comms",
        familiar: "Messages",
        description: "Talk with your exchange partners",
      },
      earth: {
        name: "Earth Signal",
        familiar: "Discover",
        description: "Daily news in your learning language",
      },
      memory: {
        name: "Memory Deck",
        familiar: "Profile",
        description: "Progress, profile and settings",
      },
    },
    status: {
      wordsSaved: "{count} saved",
      dueNow: "{count} due",
      nothingDue: "All caught up",
      unreadMessages: "{count} unread",
      loading: "…",
    },
    transition: {
      entering: "Command deck coming online",
      leaving: "Command deck standing down",
    },
    mission: {
      launching: "Mission starting",
      completeEyebrow: "Mission complete",
    },
    omni: {
      label: "Yumi OmniLexicon",
      placeholder: "Search, speak, scan, or show Yumi anything",
      placeholderChinese: "Something you can't read?",
      placeholderEnglish: "Something you heard?",
      inputText: "Type",
      inputVoice: "Voice",
      inputCamera: "Scan",
      inputImage: "Image",
      submit: "Identify",
      clear: "Clear",
      listening: "Listening\u2026",
      scanning: "Identifying\u2026",
      acquired: "Word identified",
      noMatch: "Yumi could not place that one",
      noMatchHint: "Try another spelling, say it aloud, or show Yumi a photo.",
      degraded: "Offline dictionary result",
      addToVocabulary: "Add to vocabulary",
      recentSignals: "Recent signals",
      playLearning: "Play the word",
      playTranslation: "Play the translation",
      playExampleLearning: "Play the example",
      playExampleTranslation: "Play the translated example",
      save: "Add to vocabulary",
      saved: "Saved",
      share: "Share",
      copied: "Copied",
      sendToFriend: "Send to a friend",
    },
    hud: {
      eyebrow: "Learning profile",
      title: "Progress HUD",
      accuracy: "Accuracy",
      retention: "Retention",
      dailyGoal: "Daily goal",
      mastered: "Words mastered",
      reviewed: "Reviews done",
    },
  },

  discover: {
    title: "Discover",
    eyebrow: "Exchange Notes",
    subtitle: "Learn English from today's major stories.",

    dailyNewsTitle: "Daily News",
    speechSpeed: "Speech speed",

    vocabulary: "Vocabulary",

    saveToNotes: "Save to Notes",
    saving: "Saving",
    saved: "Saved",
    saveError: "This story could not be saved. Please try again.",
    sendToPartner: "Send to Partner",
    sentToPartner: "Sent to your partner",
    quizSoon: "Quiz · Soon",
    quizSoonTitle: "Quiz will be added in the next phase.",

    sameBatchNotice:
      "You're already seeing today's stories — a new batch is published once a day.",
    tryAgain: "Try again",
    loadFallbackError: "Daily news is temporarily unavailable.",

    justNow: "Just now",
    minutesAgo: "{count}m ago",
    hoursAgo: "{count}h ago",
    recently: "Recently",

    readEnglishAriaLabel: "Read English story aloud",
    readChineseAriaLabel: "Read Chinese story aloud",
    readVocabWordAriaLabel: "Read {word} and its example",
    readVocabChineseAriaLabel: "Read {translation} and its Chinese example",

    loadingNewStories: "Loading",
    sendToFriendAriaLabel: "Send to a friend",
    loginRequiredError: "You're not logged in. Log in to share with a partner.",
    loadFriendsError: "Couldn't load your friends. Try again.",
    loadNewsError: "Unable to load daily news.",

    loading: "Loading today’s lessons…",

    emptyTitle: "No news is available right now",
    emptyDescription: "Please try again in a few minutes.",

    categories: {
      world: "World",
      business: "Business",
      technology: "Technology",
      science: "Science",
      health: "Health",
      culture: "Culture",
      environment: "Environment",
      politics: "Politics",
      general: "News",
    },

    latestStoriesLabel: "Latest stories",
    keyWordsLabel: "{count} key words",
    moreActionsAriaLabel: "More actions",
    openSource: "Open source",
    shareStory: "Share",
    shareCopied: "Link copied",
    hideStory: "Hide story",
    save: "Save",
    speedSlow: "Slow",
    speedNatural: "Natural",
    speedFast: "Fast",
    vocabularyDrawerTitle: "Key vocabulary",
    vocabularyDrawerDescription: "Tap a word to hear it.",

    refreshAction: "Refresh",
    playFullStory: "Play full story",
    stopStory: "Stop",
    playFullStoryAriaLabel: "Play the full story aloud",
    languageEnglish: "English",
    languageChinese: "中文",
    languageEnglishShort: "EN",
    languageChineseShort: "ZH",

    addToVocabulary: "Add to Vocabulary",
    addedToVocabulary: "Added",
    addToVocabularyAriaLabel: "Add {word} to Vocabulary",

    exploreImageLabel: "Explore this image · {count} words",
  },

  capture: {
    backToVocabulary: "Back to Vocabulary",
    backToHome: "Back to Home",
    eyebrow: "AI vocabulary capture",
    title: "Discover",
    description:
      "Photograph something, review the bilingual result, and save it as a word.",
    reset: "Reset",
    identify: "Identify",
    identifying: "Identifying",

    progress: {
      ariaLabel: "Capture progress",
      photo: "Photo",
      review: "Review",
      save: "Save",
    },

    source: {
      eyebrow: "English × Traditional Chinese",
      title: "Turn life into words",
      description:
        "Photograph an object or choose an image. AI will create a bilingual vocabulary card that you can review before saving.",
      useCamera: "Use camera",
      photoLibrary: "Photo library",
      cameraStarting: "Opening camera…",
      unsupported:
        "Live preview is unavailable in this browser. Your device camera can still open through the photo picker.",
    },

    camera: {
      cancel: "Cancel",
      captureAriaLabel: "Capture photo",
      closeCameraAriaLabel: "Close camera",
      selectedObjectAlt: "Selected object",
      chooseAnother: "Choose another",
      focusHint: "Center the object",
    },

    analysis: {
      title: "Analyzing your photo",
      description:
        "AI is identifying the object and preparing English and Traditional Chinese examples.",
    },

    result: {
      eyebrow: "AI result",
      title: "Review before saving",
      confidence: "{value} confidence",
      englishWord: "English word",
      traditionalChinese: "Traditional Chinese",
      playEnglishAriaLabel: "Play English pronunciation",
      playChineseAriaLabel: "Play Chinese pronunciation",
      partOfSpeech: "Part of speech",
      collection: "Collection",
      englishExample: "English example",
      chineseExample: "Chinese example",
      saving: "Saving",
      saved: "Saved to Vocabulary",
      saveToVocabulary: "Save to Vocabulary",
      sendToPartner: "Send to partner",
    },

    categories: {
      people: "People",
      other: "Other",
    },

    partners: {
      eyebrow: "Learning partners",
      title: "Send this word to",
      closeAriaLabel: "Close partner picker",
    },

    errors: {
      cameraPermissionDenied:
        "Camera permission was denied. Enable camera access in your browser settings, or choose an image instead.",
      noCamera: "No camera was found on this device.",
      cameraInUse: "The camera is already being used by another application.",
      cameraUnavailable:
        "Camera access is unavailable. Try choosing an image instead.",
      cameraPreview: "Could not start the camera preview. Try again.",
      processImage: "Could not process this image.",
      selectImage: "Please select an image file.",
      imageTooLarge: "Please choose an image smaller than 10 MB.",
      cameraNotReady: "The camera is not ready yet.",
      captureImage: "Could not capture the image.",
      identifyImage: "Could not identify this image.",
      identifyBusy: "AI vision is busy right now. Please try again shortly.",
      identifyDailyLimit:
        "You have used today's free image recognitions. Please try again tomorrow.",
      identifyTimeout:
        "Recognition took too long. Try a clear photo closer to the object.",
      loginBeforeSave: "Please log in before saving a word.",
      duplicateWord: "This word is already in your vocabulary.",
      saveWord: "Could not save this word.",
      loginBeforeShare: "Please log in before sharing a word.",
      loadPartners: "Could not load your learning partners.",
    },
  },

  home: {
    greeting: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },

    hero: {
      title: "Keep learning",
      description: "Build useful vocabulary from the world around you.",
      titleCurious: "Nice start",
      descriptionCurious: "Yumi is curious about your new word.",
      titleCelebrate: "Great work",
      descriptionCelebrate: "Yumi is happy and full.",
      titleDancing: "Yumi is dancing",
      descriptionDancing: "3 new words unlocked a dance.",
      titleWelcomeBack: "Welcome back",
      descriptionWelcomeBack: "One small word is a great new start.",
    },

    yumi: {
      statusWaiting: "Yumi is waiting for a new word.",
      hintWaiting: "Learn one word to make Yumi smile.",
      statusCurious: "Yumi is curious.",
      hintOneWord: "1 new word today",
      statusHappy: "Yumi is getting excited.",
      hintWordsToday: "{count} new words today",
      statusDancing: "Yumi is dancing!",
      hintThreeWords: "You learned 3 new words today.",
      statusExcited: "Yumi is proud of you.",
      hintWordsCount: "{count} words today",
      statusHungry: "Yumi is a little hungry.",
      hintHungry: "Add one word to feed Yumi.",
      statusSad: "Yumi misses learning with you.",
      hintSad: "Yumi is waiting for you.",
      statusGrumpy: "Yumi is feeling grumpy.",
      hintGrumpy: "One new word can cheer Yumi up.",
      statusLonely: "Yumi is feeling lonely.",
      hintLonely: "Yumi misses you.",
      statusSleeping: "Yumi is resting.",
      hintSleeping: "Learn a new word to wake Yumi up.",
      statusWelcomeBack: "Yumi is happy to see you.",
      hintWelcomeBack: "Welcome back. Yumi missed you.",
      reactionCurious: "Yumi feels curious.",
      reactionHappy: "Yumi feels happy.",
    },

    dailyFocus: {
      eyebrow: "Today",
      cardEyebrow: "Daily focus",
      wordReady: "1 word is ready",
      wordsReady: "{count} words are ready",
      caughtUp: "You’re all caught up",
      reviewDescription:
        "Review the words due today to keep your memory strong.",
      caughtUpDescription:
        "Explore new words and keep building your vocabulary.",
      retention: "Retention",
      accuracy: "Accuracy",
      continueReview: "Continue review",
      exploreVocabulary: "Explore vocabulary",
    },

    todayWord: {
      eyebrow: "Vocabulary first",
      title: "Today’s word",
      allWords: "All words",
      continueLearning: "Continue learning",
      englishPronunciation: "English pronunciation",
      zhuyin: "Zhuyin",
      example: "Example",
      untitledWord: "Untitled word",
      emptyHeading: "Start your first lesson",
      emptyDescription: "Add a vocabulary word and it will show up here.",
      previousWord: "Previous word",
      nextWord: "Next word",
      swipeHint: "Swipe to browse vocabulary cards",
    },

    quickStart: {
      eyebrow: "Quick start",
      title: "Continue learning",
      review: "Review",
      capture: "Capture",
      wordReady: "1 word ready",
      wordsReady: "{count} words ready",
      caughtUp: "You are caught up",
      captureDescription: "Learn a word from a photo",
    },

    pronunciation: {
      eyebrow: "Daily practice",
      title: "Pronunciation Lab",
      description: "Practice English sounds and Zhuyin.",
    },

    progress: {
      eyebrow: "Your progress",
      title: "Learning overview",
      todaysReview: "Today’s Review",
      word: "word",
      words: "words",
      readyDescription: "Your vocabulary is ready to review.",
      caughtUpDescription: "You’re all caught up for now.",
      continueReview: "Continue Review",
      accuracy: "Accuracy",
      retention: "Retention",
      mastered: "Mastered",
      practice: "Practice",
      totalReviews: "{count} total reviews",
      memoryStrength: "Memory strength",
      wordsCompleted: "Words completed",
      wordsToRevisit: "Words to revisit",
    },

    community: {
      eyebrow: "Community",
      title: "Learning partners",
      findFriends: "Find friends",
      description: "Add a friend by Exchange ID or QR code.",
      partnerLabel: "Learning Partner",
      partnerTagline: "Practice together every day",
      pendingRequestsBadge: "{count} pending friend request(s)",
    },

    notes: {
      eyebrow: "Personal",
      title: "Your notes",
      spaceEyebrow: "Personal learning space",
      spaceTitle: "Notes",
      spaceDescription: "Save useful words, sentences, and ideas.",
      newNote: "New note",
      emptyTitle: "No notes yet",
      emptyDescription: "Save a new word or idea from today's learning.",
      deleteNote: "Delete note",
      translateError: "Could not translate this note. Please try again.",
    },
  },

  pronunciation: {
    backHome: "Back to Home",
    title: "Pronunciation Lab",
    subtitle: "Tap any speaker to hear the pronunciation.",

    modes: {
      english: "English Focus",
      zhuyin: "Zhuyin Focus",
    },

    filters: {
      all: "All",
      vowels: "Vowels",
      consonants: "Consonants",
      initial: "Initials",
      medial: "Medials",
      final: "Finals",
    },

    cards: {
      howToSayIt: "How to say it",
      pronunciationMethod: "Pronunciation guide",
      playWord: "Play {word}",
      correct: "Correct",
      incorrect: "Common mistake",
      commonMistake: "Common pronunciation trap",
      showMoreGuidance: "More guidance",
      showLessGuidance: "Show less",
      commonTrapSummary: "You might pronounce {symbol} like {confusedWith}.",
      playbackFailed: "Playback failed. Tap to try again.",
      kk: "KK",
      moreSounds: "Pronunciation variants",
      romanizationHint: "Closest pinyin",
    },

    yumi: {
      mouth: "Mouth",
      tongue: "Tongue",
      airflow: "Airflow",
      voice: "Voice",
      demoAriaLabel: "Yumi showing mouth and tongue position for this sound",
      tapToHear: "Tap Yumi to hear and watch this sound.",
    },
  },

  messages: {
    title: "Messages",
    searchPlaceholder: "Search conversations",
    loadingConversations: "Loading…",
    loadingMessages: "Loading messages…",
    today: "Today",
    yesterday: "Yesterday",
    inputPlaceholder: "Write a message",
    chatFallback: "Chat",
    selectedCount: "{count} selected",
    selectAll: "Select All",
    startConversationTitle: "Start your first conversation",
    startConversationDescription:
      "Share a new word, sentence, or question with your partner.",
    deleteSelectedMessage: "Delete {count} Message",
    deleteSelectedMessages: "Delete {count} Messages",
    deleteDialogMessage: "Delete {count} message?",
    deleteDialogMessages: "Delete {count} messages?",
    deleteDialogDescription:
      "These messages will be removed only from your view. Other people in the conversation will still see them.",
    closeDeleteConfirmation: "Close delete confirmation",
    send: "Send",
    selectMessages: "Select Messages",
    delete: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
    deleteFriend: "Delete friend",
    english: "English",
    traditionalChinese: "Traditional Chinese",

    youPrefix: "You: ",
    attachmentLabel: "Photo",
    voiceLabel: "Voice message",
    muted: "Muted",
    muteConversation: "Mute",
    unmuteConversation: "Unmute",
    noConversationsFound: "No conversations found.",
    typingIndicator: "{name} is typing…",
    statusSent: "Sent",
    statusDelivered: "Delivered",
    statusRead: "Read",

    moodCalm: "Calm",
    moodCurious: "Curious",
    moodSleepy: "Sleepy",
    moodSurprised: "Surprised",
    moodHappy: "Happy",

    errors: {
      loadConversations: "Couldn't load your conversations.",
      removeFriend: "Could not remove this friend.",
      deleteSelected: "Could not delete the selected messages.",
      shareWord: "Could not share this word. Please try again.",
      openConversation: "Could not open this conversation. Please try again.",
      saveWord: "Could not save this word. Please try again.",
      updateConversation: "Could not update this conversation. Please try again.",
    },
  },
  friends: {
    backHome: "Back to Home",
    eyebrow: "Learning partners",
    title: "Friends",
    subtitle: "Add someone by Exchange ID or QR code.",
    loginRequired: "Log in to add and manage friends.",
    deleteFriend: "Delete friend",

    add: {
      title: "Add a friend",
      exchangeId: "Exchange ID",
      scanQr: "Scan QR",
      fieldLabel: "Friend’s Exchange ID",
      placeholder: "friendname",
      sendRequest: "Send Friend Request",
      sending: "Sending…",
    },

    scanner: {
      title: "Scan a friend’s QR code",
      description: "Point your camera at an Exchange Notes friend QR code.",
      start: "Start camera",
      stop: "Stop camera",
      scanning: "Scanning…",
    },

    profileQr: {
      eyebrow: "QR Code",
      title: "Share your profile",
      description: "Anyone who scans this adds you as a friend instantly.",
      imageAlt: "Your Exchange Notes friend QR code",
      loading: "Loading…",
    },

    incoming: {
      title: "Friend requests",
      empty: "No incoming friend requests.",
      accept: "Accept",
      decline: "Decline",
      responding: "Updating…",
    },

    outgoing: {
      title: "Sent requests",
      empty: "No pending sent requests.",
      cancel: "Cancel",
    },

    list: {
      title: "Your friends",
      loading: "Loading friends…",
      emptyTitle: "No friends yet",
      emptyDescription: "Add someone by Exchange ID or scan their QR code.",
    },

    banners: {
      enterExchangeId: "Enter a friend’s Exchange ID to send a request.",
      invitePrefilled:
        "Scanned @{exchangeId}. Send the request to connect with them.",
      profileNotFound:
        "Couldn’t find “@{exchangeId}”. Exchange IDs are lowercase with no spaces. Double-check with your friend.",
      ownExchangeId: "That’s your own Exchange ID. Try a friend’s instead.",
      alreadyFriends: "You and @{exchangeId} are already friends.",
      alreadyPending: "Already sent. Waiting for @{exchangeId} to accept.",
      requestSent:
        "Request sent to @{exchangeId}. They’ll see it next time they open Friends.",
      sendFailed:
        "Something went wrong while sending that request. Try again in a moment.",
      respondFailed: "Couldn’t update that request. Try again.",
      loadFailed: "Couldn’t load your friends right now. Try again shortly.",
      removeFriendFailed: "Unable to remove this friend. Please try again.",
    },

    errors: {
      invalidQr: "That QR code isn’t an Exchange Notes friend code.",
      secureContext:
        "Camera access requires HTTPS or localhost. Open the secure version of this app.",
      unsupportedCamera: "Camera scanning isn’t supported in this browser.",
      cameraPermissionDenied:
        "Camera permission was denied. Enable camera access in your browser settings, then try again.",
      noCamera: "No camera was found on this device.",
      cameraInUse:
        "The camera is already being used by another app. Close it and try again.",
      cameraUnavailable: "Could not open the camera.",
    },
  },

  vocabulary: {
    hero: {
      vocabulary: "Vocabulary",
      todayProgress: "Today’s progress",
      completion: "Completion",
      dailyTargetCompleted: "Daily target completed.",
      wordRemaining: "{count} word remaining.",
      wordsRemaining: "{count} words remaining.",
      dueToday: "Due Today",
      retention: "Retention",
      accuracy: "Accuracy",
      weakWords: "Weak Words",
      totalWords: "Total Words",
      learning: "Learning",
      mastered: "Mastered",
      today: "Today",
      startReview: "Start Review",
      library: "Library",
      collections: "Collections",
    },

    dashboard: {
      eyebrow: "Learning System",
      title: "Dashboard",
    },

    mascot: {
      greetingDefault: "Hello, Yumi. What will you learn today?",
      greetingWaiting: "Yumi is waiting for a new word.",
      moodStatus: {
        hungry: "Yumi is hungry.",
        curious: "Yumi is curious.",
        happy: "Yumi is happy.",
        excited: "Yumi is excited.",
        proud: "Yumi is proud of you.",
        missingYou: "Yumi missed you.",
        confused: "Yumi looks puzzled.",
      },
      moodShort: {
        hungry: "Hungry",
        curious: "Curious",
        happy: "Happy",
        excited: "Excited",
        proud: "Proud",
        missingYou: "Missing You",
        confused: "Puzzled",
      },
      summaryWordSingular: "{count} word today",
      summaryWordPlural: "{count} words today",
      summaryCookieSingular: "{count} cookie",
      summaryCookiePlural: "{count} cookies",
      summaryStreak: "{count} day streak",
      cookieTrayEmpty: "Add a word to earn Yumi a cookie.",
      cookieTrayHint: "Drag a cookie onto Yumi",
      cookieTrayMore: "+{count} more",
      feedAriaLabel: "Feed {word} to Yumi",
      cookieTypeLetter: "Letter cookie",
      cookieTypeZhuyin: "Zhuyin cookie",
      feedingAnticipating: "Yumi opens up with anticipation.",
      feedingEating: "Yumi is chewing slowly.",
      feedingSwallowing: "Yumi swallows the word energy.",
      feedingSatisfied: "Yumi is full and satisfied.",
      openActionsAriaLabel: "Open Yumi actions",
      closeActionsAriaLabel: "Close Yumi actions",
      actionMenuAriaLabel: "Yumi learning actions",
      menuPrompt: "Where would you like to begin?",
      reviewActionLabel: "Start review",
      addWordActionLabel: "Add a word with AI",
      cameraActionLabel: "Identify with camera",
    },

    lookup: {
      title: "Search any word",
      placeholder: "English or Traditional Chinese",
      search: "Smart search",
      searching: "Searching",
      description:
        "Search any English or Traditional Chinese word for its translation, part of speech and natural examples.",
      error: "Could not search that word.",
      degradedNotice:
        "Smart search is busy, so this came from the offline dictionary. The word and translation are correct — only the examples are generic.",
      degradedRetry: "Try again for real examples",
      english: "English",
      chinese: "Traditional Chinese",
      englishExample: "English example",
      chineseExample: "Chinese example",
      share: "Share",
      send: "Send",
      saving: "Saving",
      addToVocabulary: "Add to Vocabulary",
      unsavedTitle: "This word is not saved yet",
      noMatchingTitle: "No matching words",
      unsavedDescription:
        "Look it up to find its meaning, examples, and save it to your vocabulary.",
      noMatchingDescription:
        "Try another search or choose a different learning status.",
      lookingUp: "Looking up",
      lookUpWord: 'Look up "{word}"',
      wordFound: "Word found",
      shareWithFriend: "Send to a friend",
      closeSearchAriaLabel: "Close word search",
      inputPlaceholder: "English or Traditional Chinese",
      clearSearchAriaLabel: "Clear search",
      lowConfidenceNotice:
        "Yumi is not completely sure. Please review the result before saving.",
    },

    collections: {
      title: "Collections",
      description: "Organize vocabulary into simple learning spaces.",
      backToVocabulary: "Back to vocabulary",
      createCollection: "Create collection",
      createCollectionAria: "Create a new collection",
      loadingError: "Could not load your collections.",
      createError: "Could not create the collection.",
      toggleError: "Could not update this collection. Please try again.",
      emptyTitle: "No collections yet",
      emptyDescription:
        "Create a learning space for words you want to study together.",
      listAriaLabel: "Vocabulary collections",
      newCollection: "New collection",
      close: "Close",
      emojiLabel: "Collection emoji",
      namePlaceholder: "Collection name",
      creating: "Creating",
      create: "Create",
      noCollectionsYet: "You don't have any collections yet.",
      word: "word",
      words: "words",
      examples: {
        home: "Home",
      },

      detail: {
        fallbackTitle: "Collection",
        removeError: "Could not remove this word. Please try again.",
        backToCollections: "Back to collections",
        loadingError: "Could not load this collection.",
        loading: "Loading collection…",
        emptyTitle: "No words here yet",
        emptyDescription:
          "Open a vocabulary card and choose Collections to add it here.",
        browseVocabulary: "Browse vocabulary",
        removeWordAriaLabel: "Remove word from collection",
        word: "word",
        words: "words",
        inCollection: "in this collection",
      },
    },

    detail: {
      vocabulary: "Vocabulary",
      backToVocabulary: "Back to vocabulary",
      translation: "Translation",
      example: "Example",

      accuracy: "Accuracy",
      reviews: "Reviews",
      nextReview: "Next review",

      levels: {
        new: "New",
        learning: "Learning",
        familiar: "Familiar",
        strong: "Strong",
        mastered: "Mastered",
      },

      partOfSpeech: {
        noun: "Noun",
        verb: "Verb",
        adjective: "Adjective",
        adverb: "Adverb",
        pronoun: "Pronoun",
        preposition: "Preposition",
        conjunction: "Conjunction",
        interjection: "Interjection",
        phrase: "Phrase",
        other: "Other",
      },

      closeDetailsAriaLabel: "Close word details",
      expandDetailsAriaLabel: "Expand details for {word}",
      collapseDetailsAriaLabel: "Collapse details for {word}",
      openFullDetailsAriaLabel: "Open all details for {word}",
      editWordAriaLabel: "Edit word",
      closeAriaLabel: "Close",
      learningStatusLabel: "Learning status",
      addedLabel: "Added {date}",
      confidenceLabel: "{confidence} confidence",
      confidenceHigh: "High",
      confidenceMedium: "Medium",
      confidenceLow: "Low",
      addToCollectionsAriaLabel: "Add to collections",
      sendToFriendAriaLabel: "Send to a friend",
      shareWordAriaLabel: "Share word",
      deleteWordAriaLabel: "Delete word",
      listenAriaLabel: "Listen: {text}",
      markAsMastered: "Mark as mastered",
      markAsLearning: "Move to learning",

      reviewPanel: {
        title: "Review this word",
        description: "How well did you remember it?",
        again: "Again",
        hard: "Hard",
        good: "Good",
        easy: "Easy",
      },

      reviewDetails: {
        title: "Review details",
        lastReviewed: "Last reviewed",
        never: "Never",
        day: "day",
        days: "days",
      },

      edit: {
        title: "Edit vocabulary",
        subtitle: "Update the word and examples.",
        english: "English",
        traditionalChinese: "Traditional Chinese",
        chinesePlaceholder: "Traditional Chinese translation",
        englishExample: "English example",
        chineseExample: "Traditional Chinese example",
        chineseExamplePlaceholder: "Write a Traditional Chinese example.",
        close: "Close edit vocabulary",
        cancel: "Cancel",
        save: "Save changes",
        saving: "Saving...",
        englishRequired: "English word cannot be empty.",
        chineseRequired: "Traditional Chinese translation cannot be empty.",
        saveFailed: "Could not save your changes.",
      },

      actions: {
        edit: "Edit vocabulary",
        share: "Share vocabulary",
        copied: "Copied",
      },

      page: {
        loadError: "Could not load this word.",
      },
    },

    search: {
      vocabulary: "Vocabulary",
      yourWords: "Your words",
      addWord: "Add word",

      saved: "saved",
      learning: "learning",
      mastered: "mastered",

      /* Not "search saved vocabulary": this field also looks up words that are
         not in the list yet, so describing it as a filter over what is already
         saved understated what it does and hid the lookup entirely. */
      searchPlaceholder: "Look up any word",
      searchAriaLabel: "Look up any word",
      clearSearch: "Clear vocabulary search",
      cancel: "Cancel",
      clear: "Clear",
      noMatchingWords: "No matching words.",
      loadingVocabulary: "Loading your words",
      firstWordTitle: "Your first word begins outside",
      firstWordDescription:
        "Photograph something from daily life and save its English and Traditional Chinese meaning.",
      discoverWord: "Discover a word",

      statuses: {
        all: "All",
        new: "New",
        learning: "Learning",
        mastered: "Mastered",
      },

      word: "word",
      words: "words",

      sort: "Sort",
      openCollections: "Open collections",
      toolbarAriaLabel: "Vocabulary tools",
      lookupToolbarAriaLabel: "Look up a word",
      cameraLookup: "Identify with camera",
      photoLookup: "Identify from a photo",
      voiceSearch: "Search by voice",
      voiceListening: "Listening — tap to stop",
      cardsView: "Use classic card view",
      compactView: "Use compact list view",
      closeSortMenu: "Close sort menu",

      sortOptions: {
        new: "New Words",
        old: "Oldest First",
        alphabetical: "A to Z",
        reverseAlphabetical: "Z to A",
        recentlyReviewed: "Recently Reviewed",
        leastReviewed: "Least Reviewed",
        forYou: "For You",
        trending: "Trending",
      },

      personalizing: "Personalizing {sort}…",
    },
  },

  review: {
    backHome: "Back to Home",
    eyebrow: "Daily review",
    title: "Review",
    subtitle: "Strengthen the words that are ready today.",
    today: "Today",
    cardsReady: "Cards ready",
    introLineOne: "Review due cards first.",
    startReview: "Start review",
    freePractice: "Free practice",
    freePracticeDescription:
      "Practice every saved word anytime, with no daily limit.",
    practiceAllWords: "Practice all words",
    queueData: "Today’s queue",
    ready: "Ready",
    loadError: "Unable to load today’s review.",
    caughtUpDescription: "There are no vocabulary cards due right now.",
    sessionEyebrow: "Daily review",
    sessionTitle: "Session in progress",
    remaining: "{count} remaining",
    vocabulary: "Vocabulary",
    revealAnswer: "Reveal answer",
    saving: "Saving review…",
    saveError: "Unable to save this review.",
    completeTitle: "Nice work.",
    completeDescription: "Your review schedule has been updated.",
    completedReviews: "You completed {count} reviews.",
    backToHome: "Back to Home",
    grades: {
      again: {
        label: "Again",
        description: "Forgot",
      },
      hard: {
        label: "Hard",
        description: "Difficult",
      },
      good: {
        label: "Good",
        description: "Remembered",
      },
      easy: {
        label: "Easy",
        description: "Very easy",
      },
    },
  },

  settings: {
    title: "Settings",
    preferences: "Experience",
    learningSetup: "Learning setup",

    profile: {
      pageTitle: "Settings",
      loading: "Loading…",
      languageLearner: "Language learner",
      accountFallback: "Exchange Notes account",
      changePhoto: "Change photo",
      addPhoto: "Add photo",
      removePhoto: "Remove profile photo",
      loadingProfile: "Loading your profile…",
      profile: "Profile",
      yourName: "Your name",
      namePlaceholder: "Your name",
      exchangeId: "Exchange ID",
      exchangeIdDescription: "3–24 lowercase letters, numbers, or underscores.",
      exchangeIdPlaceholder: "yourname",
      nativeLanguage: "Native language",
      learningLanguage: "Learning language",
      nativeLanguageDescription: "The language you already speak",
      learningLanguageDescription: "The language you're practicing",
      saveChanges: "Save changes",
      saving: "Saving…",
      preferences: "Preferences",
      account: "Account",
      logout: "Log out",
      logoutDescription: "Sign out of this device",
      logoutConfirm: "Are you sure you want to log out?",
      photoImageError: "Please choose an image file.",
      photoSizeError: "Profile photos must be smaller than 5 MB.",
      photoUpdated: "Profile photo updated!",
      photoUploadError: "Could not upload your profile photo.",
      loginRequired: "You must be logged in.",
      photoRemoved: "Profile photo removed.",
      photoRemoveError: "Could not remove your profile photo.",
      profileUpdated: "Profile updated successfully!",
      profileUpdateError: "Could not update profile. Please try again.",
      languagesMustDifferError: "Native language and learning language must be different.",
      editProfile: "Edit profile",
      copyHandle: "Copy",
      copied: "Copied!",
      viewQr: "QR code",
      checkingAvailability: "Checking availability…",
      idAvailable: "This Exchange ID is available.",
      idTaken: "This Exchange ID is already taken.",
      idCheckError: "Could not check availability.",
    },

    dailyGoal: {
      rowTitle: "Daily goal",
      rowDescription: "How long you'd like to study each day",
      sheetTitle: "Daily goal",
      sheetDescription: "Choose how many minutes you'd like to study each day.",
      minutesLabel: "min",

      options: {
        five: "5 minutes",
        ten: "10 minutes",
        fifteen: "15 minutes",
        twenty: "20 minutes",
        thirty: "30 minutes",
      },
    },

    appLanguage: {
      rowTitle: "App language",
      rowDescription: "Choose the interface language",
      sheetTitle: "App language",
      sheetDescription:
        "Choose the language used by the Exchange Notes interface.",
      englishDescription: "Display the app interface in English.",
      traditionalChineseDescription:
        "Display the app interface in Traditional Chinese.",
    },

    interfaceMode: {
      rowTitle: "Interface mode",
      rowDescription: "Standard, or Yumi's Command Deck",
      sheetTitle: "Interface mode",
      sheetDescription:
        "Choose how Exchange Notes looks and how you move around it.",
      standardTitle: "Standard Mode",
      standardDescription:
        "The quick, quiet Exchange Notes you already know.",
      cosmicTitle: "Yumi Cosmic Mode",
      cosmicDescription:
        "Step into Yumi's command deck, with every feature arranged around Yumi.",
      sharedDataNote:
        "Both modes are the same Exchange Notes. Your words, messages, friends and progress stay exactly where they are, and you can switch back any time.",
    },

    scriptableWidget: {
      rowTitle: "iPhone Widget",
      rowDescription: "Connect Yumi to Scriptable",
      statusReady: "Connected",
      statusNotConfigured: "Not set up",
      statusRevoked: "Disconnected",
      statusLoading: "Checking…",
      statusUnavailable: "Unavailable",
      sheetTitle: "Scriptable iPhone Widget",
      sheetDescription:
        "Create a private token that lets the Scriptable app securely load your latest Yumi progress.",
      activeTitle: "Widget connection is active",
      activeDescription:
        "Scriptable can securely load your latest Yumi mood, cookie progress, and vocabulary.",
      emptyTitle: "Widget is not connected",
      emptyDescription:
        "Generate a private token, copy it once, and save it inside the Scriptable app on your iPhone.",
      revokedTitle: "Widget connection was revoked",
      revokedDescription:
        "The previous token can no longer access your Yumi Widget data.",
      unavailableTitle: "Widget settings are unavailable",
      unavailableDescription:
        "The Scriptable Widget service could not be reached. Try again after checking your connection.",
      tokenPrefixLabel: "Token",
      createdLabel: "Created",
      lastUsedLabel: "Last used",
      neverUsed: "Never",
      notAvailable: "Unavailable",
      oneTimeTitle: "Copy this token now",
      oneTimeDescription:
        "For security, the complete token is shown only once. Exchange Notes stores only its SHA-256 hash.",
      generate: "Generate private token",
      generating: "Generating…",
      generateSuccess: "Your new Scriptable token is ready.",
      rotate: "Replace private token",
      rotating: "Replacing…",
      rotateConfirmTitle: "Replace the current token?",
      rotateConfirmDescription:
        "The current token will stop working immediately. You must update the token saved in Scriptable.",
      confirmRotate: "Replace token",
      revoke: "Disconnect Widget",
      revoking: "Disconnecting…",
      revokeSuccess: "The Scriptable Widget connection was revoked.",
      revokeConfirmTitle: "Disconnect the Widget?",
      revokeConfirmDescription:
        "Scriptable will no longer be able to load your Yumi Widget data with the current token.",
      confirmRevoke: "Disconnect",
      refresh: "Refresh status",
      close: "Done",
      copy: "Copy token",
      copied: "Copied",
      cancel: "Cancel",
      authenticationError:
        "Your session has expired. Sign in again before managing the Widget.",
      loadError:
        "Widget status could not be loaded. Please try again.",
      actionError:
        "The Widget connection could not be updated. Please try again.",
      copyError:
        "The token could not be copied. Select and copy it manually.",
    },

    iphoneWidget: {
      rowTitle: "Yumi iPhone Widget",
      rowDescription: "Native Exchange Notes widget with automatic sync",
      statusNative: "Native",
      sheetTitle: "Yumi iPhone Widget",
      sheetDescription:
        "This widget ships inside the native app build. If you are not running that build, use the Scriptable widget above instead.",
      nativeTitle: "Native widget is ready",
      nativeDescription:
        "Open Exchange Notes to securely sync Yumi and your latest vocabulary to the iPhone Home Screen.",
      addTitle: "Add to Home Screen",
      stepOne: "Touch and hold an empty area of the iPhone Home Screen.",
      stepTwo: "Tap Edit, then choose Add Widget.",
      stepThree: "Search for Exchange Notes or Yumi.",
      stepFour: "Choose the small, medium, or large size and add it.",
      behaviorTitle: "Button behavior",
      behaviorDescription:
        "A and ㄅ play pronunciation without opening the app. Tapping the word opens its matching vocabulary detail page.",
      openAppNote: "+ and camera recognition open their matching app features.",
      done: "Done",
    },

    webPush: {
      rowTitle: "Notifications",
      rowDescription: "Message and learning updates",
      sheetTitle: "Notifications",
      sheetDescription:
        "Choose whether Exchange Notes can send notifications to this device.",
      statusOn: "On",
      statusOff: "Off",
      statusLoading: "Checking…",
      statusNeedsHomeScreen: "Install first",
      statusUnsupported: "Unsupported",
      statusBlocked: "Blocked",
      statusUnavailable: "Unavailable",
      enabledTitle: "Notifications are on",
      enabledDescription:
        "This device can receive message and learning notifications.",
      disabledTitle: "Notifications are off",
      disabledDescription:
        "Turn them on to receive updates when Exchange Notes is not open.",
      needsHomeScreenTitle: "Add Exchange Notes to your Home Screen",
      needsHomeScreenDescription:
        "On iPhone or iPad, use the Install Exchange Notes option in this section, then open the app from your Home Screen.",
      unsupportedTitle: "Notifications are not supported",
      unsupportedDescription:
        "This browser or device cannot receive Web Push notifications.",
      blockedTitle: "Notifications are blocked",
      blockedDescription:
        "Allow notifications for Exchange Notes in your browser or device settings, then return here.",
      unavailableTitle: "Notifications are unavailable",
      unavailableDescription:
        "Web Push is not available in this version of Exchange Notes.",
      enable: "Turn on notifications",
      enabling: "Turning on…",
      disable: "Turn off notifications",
      disabling: "Turning off…",
      authenticationError:
        "Sign in again before changing notification settings.",
      permissionDismissedError:
        "Notification permission was not granted. Try again when you are ready.",
      subscriptionError:
        "Notifications could not be enabled. Please try again.",
      unsubscribeError:
        "Notifications could not be disabled. Please try again.",
      statusError:
        "Notification status could not be checked. Please try again.",
      sendTest: "Send test notification",
      testing: "Sending test…",
      testDescription:
        "The test is sent to every active Exchange Notes device on your account.",
      testSuccess:
        "A test notification was sent to your active Exchange Notes devices.",
      testAuthenticationError:
        "Your session has expired. Sign in again before sending a test.",
      testNoSubscriptionError:
        "No active server subscription was found. Turn notifications off and on again.",
      testExpiredError:
        "Your saved notification subscription has expired. Turn notifications off and on again.",
      testDeliveryError:
        "The test notification could not be delivered. Please try again.",
      testNetworkError:
        "The test service could not be reached. Check your connection and try again.",
    },

    fontSize: {
      rowTitle: "Font size",
      rowDescription: "Adjust text throughout the app",
      sheetTitle: "Font size",
      sheetDescription: "Choose the text size used throughout Exchange Notes.",

      options: {
        small: {
          label: "Small",
          description: "Fits more information on screen.",
        },

        medium: {
          label: "Medium",
          description: "The balanced default size.",
        },

        large: {
          label: "Large",
          description: "Easier and more comfortable to read.",
        },
      },
    },

    pronunciation: {
      rowTitle: "Pronunciation",
      rowDescription: "Voice and reading speed",
      sheetTitle: "Pronunciation",
      sheetDescription:
        "Choose the voice and reading speed used throughout Exchange Notes.",
      readingSpeed: "Reading speed",
      readingSpeedDescription:
        "Adjust how quickly words and examples are spoken.",
      readingSpeedAriaLabel: "Reading speed",
      slower: "Slower",
      faster: "Faster",
      voice: "Voice",
      voiceDescription: "Select your preferred pronunciation voice.",
      female: "Female",
      male: "Male",
      testVoice: "Test voice",
      genderUnavailable:
        "Safari has no {gender} {language} voice, so {fallback} is used. Downloading more voices in iOS Settings will not help — iOS keeps those for native apps and only offers Safari the two built-in Chinese voices.",
      voicesOnDevice: "Voices on this device",
      voicesOnDeviceDescription:
        "Pick a voice by name to be certain which one you get. Without a choice, the app guesses from the voice name, which cannot always find the gender you asked for.",
      voiceAutomatic: "Automatic",
      noVoicesInstalled: "This device has no voice installed for this language.",
    },
  },
};

export default english;
