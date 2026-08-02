import type { TranslationDictionary } from "@/lib/i18n/types";

const english: TranslationDictionary = {
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
    retry: "Try again",
    error: "Something went wrong",
  },

  auth: {
    language: {
      eyebrow: "Exchange Notes",
      title: "Choose your language",
      subtitle: "Select the language used throughout the app.",
      englishTitle: "English",
      englishDescription: "Use Exchange Notes in English",
      traditionalChineseTitle: "繁體中文",
      traditionalChineseDescription: "Use Exchange Notes in Traditional Chinese",
      continue: "Continue",
    },

    login: {
      eyebrow: "English × Traditional Chinese",
      title: "Exchange Notes",
      subtitle: "Log in to your private learning space.",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "At least 6 characters",
      forgotPassword: "Forgot password?",
      submit: "Log In",
      submitting: "Logging in…",
      createAccount: "Create Account",
      genericError: "Could not log in. Please try again.",
      changeLanguage: "Change language",
    },
  },

  navigation: {
    vocabulary: "Vocabulary",
    messages: "Messages",
    home: "Home",
    discover: "Discover",
    settings: "Settings",
  },

  discover: {
    title: "Discover",
    eyebrow: "Exchange Notes",
    subtitle: "Real news, rewritten as a daily English lesson.",

    vocabulary: "Vocabulary",
    sendToFriend: "Send",
    newStories: "New Stories",
    loadingNewStories: "Loading…",
    loadNewStoriesAriaLabel: "Load new stories",
    originalSourceAriaLabel: "Open original source",
    sendToFriendAriaLabel: "Send to a friend",
    shareAriaLabel: "Share article",
    listenHeadlineAriaLabel: "Listen to headline in English",
    listenSummaryAriaLabel: "Listen to summary in English",
    loginRequiredError: "You're not logged in. Log in to share with a partner.",
    loadFriendsError: "Couldn't load your friends. Try again.",
    loadNewsError: "Daily News could not be loaded.",
    loadNewsRetryError:
      "Daily News could not be loaded. Please try again shortly.",

    loading: "Loading today’s lessons…",
    loadingDescription: "Preparing current news as English learning material.",

    emptyTitle: "No lessons yet",
    emptyDescription: "New English news lessons will appear here.",

    errorTitle: "Unable to load Discover",
    errorDescription: "Check your connection and try again.",

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
  },

  capture: {
    backToVocabulary: "Back to Vocabulary",
    backToHome: "Back to Home",
    backToCapture: "Back to Discover",
    eyebrow: "AI vocabulary capture",
    title: "Discover",
    description:
      "Photograph something, review the bilingual result, and save it as a word.",
    reset: "Reset",

    progress: {
      ariaLabel: "Capture progress",
      photo: "Photo",
      analyze: "Analyze",
      review: "Review",
      save: "Save",
    },

    source: {
      eyebrow: "English × Traditional Chinese",
      title: "Turn life into words",
      description:
        "Photograph an object or choose an image. AI will create a bilingual vocabulary card that you can review before saving.",
      takePhoto: "Take photo",
      useCamera: "Use camera",
      chooseImage: "Choose image",
      photoLibrary: "Photo library",
      cameraStarting: "Opening camera…",
      unsupported:
        "Live preview is unavailable in this browser. Your device camera can still open through the photo picker.",
    },

    camera: {
      cancel: "Cancel",
      captureAriaLabel: "Capture photo",
      selectedObjectAlt: "Selected object",
      selectedImage: "Selected image",
      analyzeAgain: "Analyze again",
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
      loadingPartners: "Loading partners",
      sendToPartner: "Send to partner",
    },

    categories: {
      people: "People",
      objects: "Objects",
      actions: "Actions",
      other: "Other",
    },

    partners: {
      eyebrow: "Learning partners",
      title: "Send this word to",
      closeAriaLabel: "Close partner picker",
    },

    errors: {
      openSelectedImage: "Could not open the selected image.",
      cameraPermissionDenied:
        "Camera permission was denied. Enable camera access in your browser settings, or choose an image instead.",
      noCamera: "No camera was found on this device.",
      cameraInUse: "The camera is already being used by another application.",
      cameraUnavailable:
        "Camera access is unavailable. Try choosing an image instead.",
      cameraPreview: "Could not start the camera preview. Try again.",
      readImage: "Could not read this image.",
      openImage: "Could not open this image.",
      processImage: "Could not process this image.",
      selectImage: "Please select an image file.",
      imageTooLarge: "Please choose an image smaller than 10 MB.",
      cameraNotReady: "The camera is not ready yet.",
      captureImage: "Could not capture the image.",
      identifyImage: "Could not identify this image.",
      loginBeforeSave: "Please log in before saving a word.",
      duplicateWord: "This word is already in your vocabulary.",
      saveWord: "Could not save this word.",
      loginBeforeShare: "Please log in before sharing a word.",
      noPartners:
        "You don't have any learning partners yet. Add a friend first.",
      loadPartners: "Could not load your learning partners.",
      sendWord: "Could not send this word.",
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
    },

    dailyFocus: {
      eyebrow: "Today",
      sectionTitle: "Your daily focus",
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
      playEnglishExampleAriaLabel: "Play English example",
      playChineseExampleAriaLabel: "Play Chinese example",
    },

    quickStart: {
      eyebrow: "Quick start",
      title: "Continue learning",
      review: "Review",
      capture: "Capture",
      loadingWords: "Loading your words…",
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
      openReview: "Open Review",
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
    },
  },

  pronunciation: {
    backHome: "Back to Home",
    title: "Pronunciation Lab",
    subtitle: "Tap any speaker to hear the pronunciation.",

    modes: {
      english: "English",
      zhuyin: "Zhuyin",
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
      playSound: "Play the {symbol} sound",
      playWord: "Play {word}",
      correct: "Correct",
      incorrect: "Common mistake",
      commonMistake: "Common pronunciation trap",
    },
  },

  messages: {
    title: "Messages",
    searchPlaceholder: "Search conversations",
    loadingConversations: "Loading…",
    loadingMessages: "Loading messages…",
    today: "Today",
    yesterday: "Yesterday",
    removeFriendConfirm: "Remove {name} from your friends?",
    inputPlaceholder: "Write a message",
    backToMessages: "Back to Messages",
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
    analyzingAndSending: "Analyzing and sending…",
    send: "Send",
    selectMessages: "Select Messages",
    delete: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
    deleteFriend: "Delete friend",
    deleteMessage: "Delete message",
    deleteMessages: "Delete messages",
    english: "English",
    traditionalChinese: "Traditional Chinese",

    errors: {
      notLoggedIn: "You are not logged in.",
      loadConversations: "Couldn't load your conversations.",
      removeFriend: "Could not remove this friend.",
      noMessagesDeleted:
        "No messages were deleted. You can only delete messages you sent.",
      partialDelete:
        "Some messages could not be deleted. You can only delete messages you sent.",
      deleteSelected: "Could not delete the selected messages.",
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
      loginToGetCode: "Log in to get your code",
    },

    incoming: {
      title: "Friend requests",
      empty: "No incoming friend requests.",
      accept: "Accept",
      decline: "Decline",
      responding: "Updating…",
      wantsToConnect: "wants to connect",
    },

    outgoing: {
      title: "Sent requests",
      empty: "No pending sent requests.",
      pending: "Pending",
      cancel: "Cancel",
      cancelling: "Cancelling…",
      waitingForResponse: "Waiting for a response",
    },

    list: {
      title: "Your friends",
      loading: "Loading friends…",
      emptyTitle: "No friends yet",
      emptyDescription: "Add someone by Exchange ID or scan their QR code.",
    },

    banners: {
      loginFirst: "Log in first, then you can start adding friends.",
      enterExchangeId: "Enter a friend’s Exchange ID to send a request.",
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
      cancelFailed: "Couldn’t cancel that request. Try again.",
      loadFailed: "Couldn’t load your friends right now. Try again shortly.",
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

    lookup: {
      title: "Search any word",
      placeholder: "English or Traditional Chinese",
      search: "Search with Gemini",
      searching: "Searching",
      description:
        "Search any English or Traditional Chinese word. Gemini will generate its translation, part of speech and natural examples.",
      error: "Could not search that word.",
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
    },

    collections: {
      title: "Collections",
      description: "Organize vocabulary into simple learning spaces.",
      backToVocabulary: "Back to vocabulary",
      createCollection: "Create collection",
      createCollectionAria: "Create a new collection",
      loadingError: "Could not load your collections.",
      createError: "Could not create the collection.",
      emptyTitle: "No collections yet",
      emptyDescription:
        "Create a learning space for words you want to study together.",
      suggestions: "Start with an example",
      listAriaLabel: "Vocabulary collections",
      newCollection: "New collection",
      close: "Close",
      emojiLabel: "Collection emoji",
      namePlaceholder: "Collection name",
      creating: "Creating",
      word: "word",
      words: "words",
      examples: {
        food: "Food",
        fashion: "Fashion",
        travel: "Travel",
        work: "Work",
        home: "Home",
      },

      detail: {
        fallbackTitle: "Collection",
        backToCollections: "Back to collections",
        loadingError: "Could not load this collection.",
        emptyTitle: "No words here yet",
        emptyDescription:
          "Open a vocabulary card and choose Collections to add it here.",
        browseVocabulary: "Browse vocabulary",
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

      learningProgress: "Learning progress",
      accuracy: "Accuracy",
      reviews: "Reviews",
      nextReview: "Next review",
      starsAriaLabel: "{count} out of 5 stars",

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
        interval: "Interval",
        day: "day",
        days: "days",
        ease: "Ease",
      },

      edit: {
        title: "Edit vocabulary",
        subtitle: "Update the word and examples.",
        english: "English",
        traditionalChinese: "Traditional Chinese",
        englishPlaceholder: "English word or phrase",
        chinesePlaceholder: "Traditional Chinese translation",
        englishExample: "English example",
        chineseExample: "Traditional Chinese example",
        englishExamplePlaceholder: "Use the word in an English sentence.",
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
        loginToView: "Please log in to view this word.",
        loginToEdit: "Please log in to edit this word.",
        loadError: "Could not load this word.",
        notFound: "Word not found",
        unavailable: "This word is unavailable.",
        deleteWord: "Delete Word",
        deleteConfirm: 'Delete "{word}" from your vocabulary?',
      },
    },

    search: {
      vocabulary: "Vocabulary",
      yourWords: "Your words",
      addWord: "Add word",

      saved: "saved",
      learning: "learning",
      mastered: "mastered",

      searchPlaceholder: "Search saved vocabulary",
      searchAriaLabel: "Search saved vocabulary",
      clearSearch: "Clear vocabulary search",
      cancel: "Cancel",
      clear: "Clear",
      noMatchingWords: "No matching words.",

      statuses: {
        all: "All",
        new: "New",
        learning: "Learning",
        mastered: "Mastered",
      },

      word: "word",
      words: "words",

      sort: "Sort",
      openLibrary: "Open vocabulary library",
      closeSortMenu: "Close sort menu",

      sortOptions: {
        new: "New Words",
        forYou: "For You",
        trending: "Trending",
      },

      personalizing: "Personalizing {sort}…",
    },
  },

  review: {
    backHome: "Back to Home",
    backReview: "Back to Review",
    eyebrow: "Daily review",
    title: "Review",
    subtitle: "Strengthen the words that are ready today.",
    today: "Today",
    cardsReady: "Cards ready",
    introLineOne: "Review due cards first.",
    introLineTwo: "New words follow.",
    startReview: "Start review",
    freePractice: "Free practice",
    freePracticeDescription:
      "Practice every saved word anytime, with no daily limit.",
    practiceAllWords: "Practice all words",
    noWordsTitle: "No vocabulary yet",
    noWordsDescription: "Add your first word to begin practicing.",
    addWords: "Add words",
    practiceEyebrow: "Free practice",
    practiceTitle: "Practice in progress",
    queueData: "Today’s queue",
    ready: "Ready",
    loadingQueue: "Loading review queue…",
    system: "Review system",
    loadError: "Unable to load today’s review.",
    retry: "Try again",
    caughtUpTitle: "You’re all caught up",
    caughtUpDescription: "There are no vocabulary cards due right now.",
    sessionEyebrow: "Daily review",
    sessionTitle: "Session in progress",
    remaining: "{count} remaining",
    progressAriaLabel: "{completed} of {total} reviews completed",
    vocabulary: "Vocabulary",
    revealAnswer: "Reveal answer",
    saving: "Saving review…",
    saveError: "Unable to save this review.",
    completeEyebrow: "Session complete",
    completeTitle: "Nice work.",
    completeDescription: "Your review schedule has been updated.",
    completedReviews: "You completed {count} reviews.",
    reviewAgain: "Review again",
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
      accountDetails: "Account details",
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
      loginUploadError: "You must be logged in to upload a profile photo.",
      photoUpdated: "Profile photo updated!",
      photoUploadError: "Could not upload your profile photo.",
      loginRequired: "You must be logged in.",
      photoRemoved: "Profile photo removed.",
      photoRemoveError: "Could not remove your profile photo.",
      loginUpdateError: "You must be logged in to update your profile.",
      exchangeIdLength: "Exchange ID must contain at least 3 characters.",
      profileUpdated: "Profile updated successfully!",
      profileUpdateError: "Could not update profile. Please try again.",
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
      settingsAriaLabel: "Pronunciation settings",
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
    },
  },
};

export default english;
