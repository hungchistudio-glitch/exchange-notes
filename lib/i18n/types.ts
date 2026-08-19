import type { InterfaceLanguage } from "@/lib/appPreferences";

export type TranslationLanguage = InterfaceLanguage;

export type TranslationDictionary = {
  pwa: {
    title: string;
    subtitle: string;
    benefitInstantTitle: string;
    benefitInstantDescription: string;
    benefitConnectedTitle: string;
    benefitConnectedDescription: string;
    benefitAnywhereTitle: string;
    benefitAnywhereDescription: string;
    installCta: string;
    maybeLater: string;
    gotIt: string;
    iosStepsTitle: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
    iosStep4: string;
    settingsRowTitle: string;
    settingsRowDescription: string;
    installedRowTitle: string;
    updateReadyTitle: string;
    updateReadyAction: string;
    updateReadyDismiss: string;
  };
  onboarding: {
    back: string;
    continue: string;
    welcome: {
      title: string;
      subtitle: string;
      cta: string;
    };
    name: {
      title: string;
      displayNameLabel: string;
      displayNamePlaceholder: string;
      usernameLabel: string;
      usernamePlaceholder: string;
      usernameHint: string;
      checkingAvailability: string;
      idAvailable: string;
      idTaken: string;
      idCheckError: string;
      addPhoto: string;
      changePhoto: string;
      photoImageError: string;
      photoSizeError: string;
      photoUploadError: string;
      saveError: string;
    };
    appLanguage: {
      title: string;
      subtitle: string;
      note: string;
    };
    languages: {
      title: string;
      nativeLabel: string;
      nativeDescription: string;
      learningLabel: string;
      learningDescription: string;
      previewPrimary: string;
      previewSecondary: string;
      sameLanguageHint: string;
      completeError: string;
    };
    confirm: {
      title: string;
      nameLabel: string;
      appLanguageLabel: string;
      nativeLabelSummary: string;
      learningLabelSummary: string;
      note: string;
      cta: string;
    };
  };
  common: {
    back: string;
    close: string;
    cancel: string;
    confirm: string;
    save: string;
    saving: string;
    delete: string;
    edit: string;
    share: string;
    send: string;
    source: string;
    loading: string;
    error: string;
    clearField: string;
  };

  auth: {
    language: {
      eyebrow: string;
      title: string;
      subtitle: string;
      englishTitle: string;
      englishDescription: string;
      traditionalChineseDescription: string;
      continue: string;
    };

    login: {
      eyebrow: string;
      title: string;
      subtitle: string;
      googleSubtitle: string;
      consentNotice: string;
      googleSubmit: string;
      googleSubmitting: string;
      email: string;
      genericError: string;
    };
  };

  tutorial: {
    rowTitle: string;
    rowDescription: string;
    rowValue: string;
    homeButton: string;
    open: string;
    skip: string;
    back: string;
    next: string;
    finish: string;
    close: string;
    stepLabel: string;
    replay: string;

    steps: {
      meet: { title: string; body: string };
      setup: {
        title: string;
        body: string;
        appLanguageLabel: string;
        learningLabel: string;
        note: string;
        saveError: string;
      };
      name: { title: string; body: string };
      senses: { title: string; body: string };
      home: { title: string; body: string };
      vocabulary: { title: string; body: string };
      capture: { title: string; body: string; action: string };
      discover: { title: string; body: string; action: string };
      messages: { title: string; body: string };
      friends: { title: string; body: string; action: string };
      settings: { title: string; body: string; action: string };
      done: { title: string; body: string };
    };
  };

  navigation: {
    vocabulary: string;
    messages: string;
    home: string;
    discover: string;
    settings: string;
    primaryLabel: string;
  };

  /*
   * Yumi Cosmic Mode. Each room carries both its deck name and the plain name
   * of the feature it opens, so nobody has to guess that "Scanner Bay" is the
   * camera. Counts are the app's real numbers — there is no copy here for
   * anything the system does not actually know.
   */
  cosmic: {
    modeName: string;
    deck: {
      eyebrow: string;
      title: string;
      subtitle: string;
      coreLabel: string;
      dockLabel: string;
      roomsLabel: string;
      readoutLexicon: string;
      readoutDue: string;
      readoutLearning: string;
      languageEnglish: string;
      languageChinese: string;
    };
    rooms: {
      lexicon: { name: string; familiar: string; description: string };
      mission: { name: string; familiar: string; description: string };
      scanner: { name: string; familiar: string; description: string };
      comms: { name: string; familiar: string; description: string };
      earth: { name: string; familiar: string; description: string };
      memory: { name: string; familiar: string; description: string };
    };
    status: {
      wordsSaved: string;
      dueNow: string;
      nothingDue: string;
      unreadMessages: string;
      loading: string;
    };
    transition: {
      entering: string;
      leaving: string;
    };
    mission: {
      launching: string;
      completeEyebrow: string;
    };
    omni: {
      label: string;
      placeholder: string;
      placeholderChinese: string;
      placeholderEnglish: string;
      inputText: string;
      inputVoice: string;
      inputCamera: string;
      inputImage: string;
      submit: string;
      clear: string;
      listening: string;
      scanning: string;
      acquired: string;
      noMatch: string;
      noMatchHint: string;
      degraded: string;
      addToVocabulary: string;
      recentSignals: string;
      playLearning: string;
      playTranslation: string;
      playExampleLearning: string;
      playExampleTranslation: string;
      save: string;
      saved: string;
      share: string;
      copied: string;
      sendToFriend: string;
    };
    hud: {
      eyebrow: string;
      title: string;
      accuracy: string;
      retention: string;
      dailyGoal: string;
      mastered: string;
      reviewed: string;
    };
  };

  discover: {
    title: string;
    eyebrow: string;
    subtitle: string;

    dailyNewsTitle: string;
    speechSpeed: string;

    vocabulary: string;

    saveToNotes: string;
    saving: string;
    saved: string;
    saveError: string;
    sendToPartner: string;
    sentToPartner: string;
    quizSoon: string;
    quizSoonTitle: string;

    sameBatchNotice: string;
    tryAgain: string;
    loadFallbackError: string;

    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    recently: string;

    readEnglishAriaLabel: string;
    readChineseAriaLabel: string;
    readVocabWordAriaLabel: string;
    readVocabChineseAriaLabel: string;

    loadingNewStories: string;
    sendToFriendAriaLabel: string;
    loginRequiredError: string;
    loadFriendsError: string;
    loadNewsError: string;

    loading: string;

    emptyTitle: string;
    emptyDescription: string;

    categories: {
      world: string;
      business: string;
      technology: string;
      science: string;
      health: string;
      culture: string;
      environment: string;
      politics: string;
      general: string;
    };

    latestStoriesLabel: string;
    keyWordsLabel: string;
    moreActionsAriaLabel: string;
    openSource: string;
    shareStory: string;
    shareCopied: string;
    hideStory: string;
    save: string;
    speedSlow: string;
    speedNatural: string;
    speedFast: string;
    vocabularyDrawerTitle: string;
    vocabularyDrawerDescription: string;

    signalControlsEyebrow: string;
    signalControlsTitle: string;
    signalControlsClose: string;
    signalControlsSpeed: string;
    signalControlsTopics: string;
    signalControlsAllTopics: string;
    signalControlsOpen: string;
    radarLabel: string;
    radarIdle: string;
    radarScanning: string;
    radarSyncing: string;
    radarSuccess: string;
    radarError: string;
    radarOffline: string;
    refreshAction: string;
    playFullStory: string;
    stopStory: string;
    playFullStoryAriaLabel: string;
    languageEnglish: string;
    languageChinese: string;
    languageEnglishShort: string;
    languageChineseShort: string;

    addToVocabulary: string;
    addedToVocabulary: string;
    addToVocabularyAriaLabel: string;

    exploreImageLabel: string;
  };

  capture: {
    backToVocabulary: string;
    backToHome: string;
    eyebrow: string;
    title: string;
    description: string;
    reset: string;
    identify: string;
    identifying: string;

    progress: {
      ariaLabel: string;
      photo: string;
      review: string;
      save: string;
    };

    source: {
      eyebrow: string;
      title: string;
      description: string;
      useCamera: string;
      photoLibrary: string;
      cameraStarting: string;
      unsupported: string;
    };

    camera: {
      cancel: string;
      captureAriaLabel: string;
      closeCameraAriaLabel: string;
      selectedObjectAlt: string;
      chooseAnother: string;
      focusHint: string;
      opening: string;
    };

    analysis: {
      title: string;
      description: string;
    };

    result: {
      eyebrow: string;
      title: string;
      confidence: string;
      englishWord: string;
      traditionalChinese: string;
      playEnglishAriaLabel: string;
      playChineseAriaLabel: string;
      partOfSpeech: string;
      collection: string;
      englishExample: string;
      chineseExample: string;
      saving: string;
      saved: string;
      saveToVocabulary: string;
      sendToPartner: string;
    };

    categories: {
      people: string;
      other: string;
    };

    partners: {
      eyebrow: string;
      title: string;
      closeAriaLabel: string;
    };

    errors: {
      cameraPermissionDenied: string;
      noCamera: string;
      cameraInUse: string;
      cameraUnavailable: string;
      cameraPreview: string;
      processImage: string;
      selectImage: string;
      imageTooLarge: string;
      cameraNotReady: string;
      captureImage: string;
      identifyImage: string;
      identifyBusy: string;
      identifyDailyLimit: string;
      identifyTimeout: string;
      loginBeforeSave: string;
      duplicateWord: string;
      saveWord: string;
      loginBeforeShare: string;
      loadPartners: string;
    };
  };

  home: {
    greeting: {
      morning: string;
      afternoon: string;
      evening: string;
    };

    hero: {
      title: string;
      description: string;
      titleCurious: string;
      descriptionCurious: string;
      titleCelebrate: string;
      descriptionCelebrate: string;
      titleDancing: string;
      descriptionDancing: string;
      titleWelcomeBack: string;
      descriptionWelcomeBack: string;
    };

    yumi: {
      statusWaiting: string;
      hintWaiting: string;
      statusCurious: string;
      hintOneWord: string;
      statusHappy: string;
      hintWordsToday: string;
      statusDancing: string;
      hintThreeWords: string;
      statusExcited: string;
      hintWordsCount: string;
      statusHungry: string;
      hintHungry: string;
      statusSad: string;
      hintSad: string;
      statusGrumpy: string;
      hintGrumpy: string;
      statusLonely: string;
      hintLonely: string;
      statusSleeping: string;
      hintSleeping: string;
      statusWelcomeBack: string;
      hintWelcomeBack: string;
      reactionCurious: string;
      reactionHappy: string;
    };

    dailyFocus: {
      eyebrow: string;
      cardEyebrow: string;
      wordReady: string;
      wordsReady: string;
      caughtUp: string;
      reviewDescription: string;
      caughtUpDescription: string;
      retention: string;
      accuracy: string;
      continueReview: string;
      exploreVocabulary: string;
    };

    todayWord: {
      eyebrow: string;
      title: string;
      allWords: string;
      continueLearning: string;
      englishPronunciation: string;
      zhuyin: string;
      example: string;
      untitledWord: string;
      emptyHeading: string;
      emptyDescription: string;
      previousWord: string;
      nextWord: string;
      swipeHint: string;
    };

    quickStart: {
      eyebrow: string;
      title: string;
      review: string;
      capture: string;
      wordReady: string;
      wordsReady: string;
      caughtUp: string;
      captureDescription: string;
    };

    pronunciation: {
      eyebrow: string;
      title: string;
      description: string;
    };

    progress: {
      eyebrow: string;
      title: string;
      todaysReview: string;
      word: string;
      words: string;
      readyDescription: string;
      caughtUpDescription: string;
      continueReview: string;
      accuracy: string;
      retention: string;
      mastered: string;
      practice: string;
      totalReviews: string;
      memoryStrength: string;
      wordsCompleted: string;
      wordsToRevisit: string;
    };

    community: {
      eyebrow: string;
      title: string;
      findFriends: string;
      description: string;
      partnerLabel: string;
      partnerTagline: string;
      pendingRequestsBadge: string;
    };

    notes: {
      eyebrow: string;
      title: string;
      spaceEyebrow: string;
      spaceTitle: string;
      spaceDescription: string;
      newNote: string;
      emptyTitle: string;
      emptyDescription: string;
      deleteNote: string;
      translateError: string;
    };
  };

  pronunciation: {
    backToVocabulary: string;
    backHome: string;
    title: string;
    subtitle: string;

    modes: {
      english: string;
      zhuyin: string;
    };

    filters: {
      all: string;
      vowels: string;
      consonants: string;
      initial: string;
      medial: string;
      final: string;
    };

    cards: {
      howToSayIt: string;
      pronunciationMethod: string;
      playWord: string;
      correct: string;
      incorrect: string;
      commonMistake: string;
      showMoreGuidance: string;
      showLessGuidance: string;
      commonTrapSummary: string;
      playbackFailed: string;
      kk: string;
      moreSounds: string;
      romanizationHint: string;
    };

    yumi: {
      mouth: string;
      tongue: string;
      airflow: string;
      voice: string;
      demoAriaLabel: string;
      tapToHear: string;
    };
  };

  messages: {
    title: string;
    searchPlaceholder: string;
    loadingConversations: string;
    loadingMessages: string;
    today: string;
    yesterday: string;
    inputPlaceholder: string;
    chatFallback: string;
    selectedCount: string;
    selectAll: string;
    startConversationTitle: string;
    startConversationDescription: string;
    deleteSelectedMessage: string;
    deleteSelectedMessages: string;
    deleteDialogMessage: string;
    deleteDialogMessages: string;
    deleteDialogDescription: string;
    closeDeleteConfirmation: string;
    send: string;
    selectMessages: string;
    delete: string;
    deleting: string;
    cancel: string;
    deleteFriend: string;
    english: string;
    traditionalChinese: string;

    youPrefix: string;
    attachmentLabel: string;
    voiceLabel: string;
    muted: string;
    muteConversation: string;
    unmuteConversation: string;
    noConversationsFound: string;
    typingIndicator: string;
    statusSent: string;
    statusDelivered: string;
    statusRead: string;

    /*
     * The two pages of the messaging architecture, kept apart here the same
     * way they are kept apart on screen. `hub` answers "who do I want to talk
     * to?"; `room` answers "what are we saying to each other?".
     */
    hub: {
      eyebrow: string;
      subtitleFirst: string;
      subtitleSecond: string;
      searchPlaceholder: string;
      searchLabel: string;
      clearSearch: string;

      tabs: {
        recent: string;
        friends: string;
        requests: string;
      };

      resultGroupPeople: string;
      resultGroupConversations: string;
      resultGroupLanguage: string;
      searching: string;

      newConversation: string;
      openConversation: string;
      archived: string;
      archivedTitle: string;
      archivedSubtitle: string;
      archivedEmpty: string;
      archive: string;
      unarchive: string;
      backToMessages: string;

      emptyFriendsTitle: string;
      emptyFriendsDescription: string;
      emptyRequests: string;
      noResultsTitle: string;
      noResultsDescription: string;

      phraseSignal: string;
      phraseSignalPlural: string;
      unreadLabel: string;
      neverMessaged: string;
    };

    /*
     * Yumi's language layer. Kept apart from `room` because it is a distinct
     * subject — what a message meant, and how to answer it — rather than more
     * chrome for the conversation screen.
     */
    decode: {
      label: string;
      whyThis: string;
      whyThisBody: string;
      close: string;
      open: string;
      reading: string;
      tone: string;
      toneUncertain: string;
      types: {
        expression: string;
        abbreviation: string;
        phrase: string;
        slang: string;
        idiom: string;
      };
      listen: string;
      savePhrase: string;
      savedPhrase: string;
      saveFailed: string;
      replyCoach: string;
    };

    coach: {
      title: string;
      subtitle: string;
      drafting: string;
      failed: string;
      retry: string;
      close: string;
      insert: string;
      inserted: string;
      ownership: string;
      directions: {
        friendly: string;
        casual: string;
        natural: string;
      };
    };

    room: {
      back: string;
      connectionConnected: string;
      connectionConnecting: string;
      connectionOffline: string;
      privateLabel: string;
      privateHint: string;
      privateNote: string;
      newMessages: string;
      jumpToLatest: string;
      options: string;
      closeOptions: string;
      addPhoto: string;
      sendMessage: string;
      unknownParticipant: string;
      notLoggedIn: string;
      sendFailed: string;
    };

    errors: {
      loadConversations: string;
      removeFriend: string;
      deleteSelected: string;
      shareWord: string;
      openConversation: string;
      saveWord: string;
      updateConversation: string;
      conversationNotFound: string;
    };
  };
  friends: {
    backHome: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    loginRequired: string;
    deleteFriend: string;

    add: {
      title: string;
      exchangeId: string;
      scanQr: string;
      fieldLabel: string;
      placeholder: string;
      sendRequest: string;
      sending: string;
    };

    scanner: {
      title: string;
      description: string;
      start: string;
      stop: string;
      scanning: string;
    };

    profileQr: {
      eyebrow: string;
      title: string;
      description: string;
      imageAlt: string;
      loading: string;
    };

    incoming: {
      title: string;
      empty: string;
      accept: string;
      decline: string;
      responding: string;
    };

    outgoing: {
      title: string;
      empty: string;
      cancel: string;
    };

    list: {
      title: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
    };

    banners: {
      enterExchangeId: string;
      invitePrefilled: string;
      profileNotFound: string;
      ownExchangeId: string;
      alreadyFriends: string;
      alreadyPending: string;
      requestSent: string;
      sendFailed: string;
      respondFailed: string;
      loadFailed: string;
      removeFriendFailed: string;
    };

    errors: {
      invalidQr: string;
      secureContext: string;
      unsupportedCamera: string;
      cameraPermissionDenied: string;
      noCamera: string;
      cameraInUse: string;
      cameraUnavailable: string;
    };
  };

  vocabulary: {
    hero: {
      vocabulary: string;
      todayProgress: string;
      completion: string;
      dailyTargetCompleted: string;
      wordRemaining: string;
      wordsRemaining: string;
      dueToday: string;
      retention: string;
      accuracy: string;
      weakWords: string;
      totalWords: string;
      learning: string;
      mastered: string;
      today: string;
      startReview: string;
      library: string;
      collections: string;
    };

    dashboard: {
      eyebrow: string;
      title: string;
    };

    mascot: {
      greetingDefault: string;
      greetingWaiting: string;
      moodStatus: {
        hungry: string;
        curious: string;
        happy: string;
        excited: string;
        proud: string;
        missingYou: string;
        confused: string;
      };
      moodShort: {
        hungry: string;
        curious: string;
        happy: string;
        excited: string;
        proud: string;
        missingYou: string;
        confused: string;
      };
      summaryWordSingular: string;
      summaryWordPlural: string;
      summaryCookieSingular: string;
      summaryCookiePlural: string;
      summaryStreak: string;
      cookieTrayEmpty: string;
      cookieTrayHint: string;
      cookieTrayMore: string;
      feedAriaLabel: string;
      /* Cosmic Mode only — the same cookies, addressed as Learning Cores. */
      coreTrayEmpty: string;
      coreTrayHint: string;
      coreTrayShowLess: string;
      coreTrayShowAllAriaLabel: string;
      coreNewBadge: string;
      coreAriaLabel: string;
      coreState: {
        new: string;
        learning: string;
        due: string;
        mastered: string;
      };
      cookieTypeLetter: string;
      cookieTypeZhuyin: string;
      feedingAnticipating: string;
      feedingEating: string;
      feedingSwallowing: string;
      feedingSatisfied: string;
      openActionsAriaLabel: string;
      closeActionsAriaLabel: string;
      actionMenuAriaLabel: string;
      menuPrompt: string;
      reviewActionLabel: string;
      addWordActionLabel: string;
      cameraActionLabel: string;
      /*
       * The Command Halo names each capability twice: a one-word name for the
       * node, and a short line saying what it does. The longer *ActionLabel
       * above stays the accessible name — a screen reader wants "Start
       * review", not "Practice".
       */
      haloReviewName: string;
      haloReviewBlurb: string;
      haloAddName: string;
      haloAddBlurb: string;
      haloCameraName: string;
      haloCameraBlurb: string;
      haloSpeakName: string;
      haloSpeakBlurb: string;
      haloCollectName: string;
      haloCollectBlurb: string;
      speakActionLabel: string;
      collectActionLabel: string;
    };

    lookup: {
      title: string;
      placeholder: string;
      search: string;
      searching: string;
      description: string;
      error: string;
      degradedNotice: string;
      degradedRetry: string;
      translationUnavailable: string;
      translationUnavailableDetail: string;
      translationUnavailableRetry: string;
      translationUnavailableSaveBlocked: string;
      english: string;
      chinese: string;
      englishExample: string;
      chineseExample: string;
      share: string;
      send: string;
      saving: string;
      addToVocabulary: string;
      unsavedTitle: string;
      noMatchingTitle: string;
      unsavedDescription: string;
      noMatchingDescription: string;
      lookingUp: string;
      lookUpWord: string;
      wordFound: string;
      shareWithFriend: string;
      closeSearchAriaLabel: string;
      inputPlaceholder: string;
      clearSearchAriaLabel: string;
      lowConfidenceNotice: string;
    };

    collections: {
      title: string;
      description: string;
      backToVocabulary: string;
      createCollection: string;
      createCollectionAria: string;
      loadingError: string;
      createError: string;
      toggleError: string;
      emptyTitle: string;
      emptyDescription: string;
      listAriaLabel: string;
      newCollection: string;
      close: string;
      emojiLabel: string;
      namePlaceholder: string;
      creating: string;
      create: string;
      noCollectionsYet: string;
      word: string;
      words: string;
      examples: {
        home: string;
      };

      detail: {
        fallbackTitle: string;
        backToCollections: string;
        loadingError: string;
        loading: string;
        removeError: string;
        emptyTitle: string;
        emptyDescription: string;
        browseVocabulary: string;
        removeWordAriaLabel: string;
        word: string;
        words: string;
        inCollection: string;
      };
    };

    detail: {
      vocabulary: string;
      backToVocabulary: string;
      translation: string;
      example: string;

      accuracy: string;
      reviews: string;
      nextReview: string;

      levels: {
        new: string;
        learning: string;
        familiar: string;
        strong: string;
        mastered: string;
      };

      partOfSpeech: {
        noun: string;
        verb: string;
        adjective: string;
        adverb: string;
        pronoun: string;
        preposition: string;
        conjunction: string;
        interjection: string;
        phrase: string;
        other: string;
      };

      closeDetailsAriaLabel: string;
      expandDetailsAriaLabel: string;
      collapseDetailsAriaLabel: string;
      openFullDetailsAriaLabel: string;
      editWordAriaLabel: string;
      closeAriaLabel: string;
      learningStatusLabel: string;
      addedLabel: string;
      confidenceLabel: string;
      confidenceHigh: string;
      confidenceMedium: string;
      confidenceLow: string;
      addToCollectionsAriaLabel: string;
      sendToFriendAriaLabel: string;
      shareWordAriaLabel: string;
      deleteWordAriaLabel: string;
      listenAriaLabel: string;
      markAsMastered: string;
      markAsLearning: string;

      reviewPanel: {
        title: string;
        description: string;
        again: string;
        hard: string;
        good: string;
        easy: string;
      };

      reviewDetails: {
        title: string;
        lastReviewed: string;
        never: string;
        day: string;
        days: string;
      };

      edit: {
        title: string;
        subtitle: string;
        english: string;
        traditionalChinese: string;
        chinesePlaceholder: string;
        englishExample: string;
        chineseExample: string;
        chineseExamplePlaceholder: string;
        close: string;
        cancel: string;
        save: string;
        saving: string;
        englishRequired: string;
        chineseRequired: string;
        saveFailed: string;
      };

      actions: {
        edit: string;
        share: string;
        copied: string;
      };

      page: {
        loadError: string;
      };
    };

    search: {
      vocabulary: string;
      yourWords: string;
      addWord: string;

      saved: string;
      learning: string;
      mastered: string;

      searchPlaceholder: string;
      searchAriaLabel: string;
      clearSearch: string;
      cancel: string;
      clear: string;
      noMatchingWords: string;
      loadingVocabulary: string;
      firstWordTitle: string;
      firstWordDescription: string;
      discoverWord: string;

      statuses: {
        all: string;
        new: string;
        learning: string;
        mastered: string;
      };

      word: string;
      words: string;

      sort: string;
      openCollections: string;
      toolbarAriaLabel: string;
      lookupToolbarAriaLabel: string;
      cameraLookup: string;
      photoLookup: string;
      voiceSearch: string;
      voiceListening: string;
      cardsView: string;
      compactView: string;
      closeSortMenu: string;

      sortOptions: {
        new: string;
        old: string;
        alphabetical: string;
        reverseAlphabetical: string;
        recentlyReviewed: string;
        leastReviewed: string;
        forYou: string;
        trending: string;
      };

      personalizing: string;
    };
  };

  review: {
    backHome: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    today: string;
    cardsReady: string;
    introLineOne: string;
    startReview: string;
    freePractice: string;
    freePracticeDescription: string;
    practiceAllWords: string;
    queueData: string;
    ready: string;
    loadError: string;
    caughtUpDescription: string;
    sessionEyebrow: string;
    sessionTitle: string;
    remaining: string;
    vocabulary: string;
    revealAnswer: string;
    saving: string;
    saveError: string;
    completeTitle: string;
    completeDescription: string;
    completedReviews: string;
    backToVocabulary: string;
    backToHome: string;
    grades: {
      again: {
        label: string;
        description: string;
      };
      hard: {
        label: string;
        description: string;
      };
      good: {
        label: string;
        description: string;
      };
      easy: {
        label: string;
        description: string;
      };
    };
  };

  settings: {
    title: string;

    /*
     * The six groups the Settings page is built from. Rendered as small
     * uppercase labels above each surface, so they are stored in natural
     * case and uppercased in CSS — Chinese has no uppercase to apply.
     */
    sections: {
      learning: string;
      yumi: string;
      app: string;
      devices: string;
      help: string;
      account: string;
    };

    search: {
      open: string;
      placeholder: string;
      cancel: string;
      resultsLabel: string;
      empty: string;
      hint: string;
    };

    devices: {
      rowTitle: string;
      rowDescription: string;
      connectedCount: string;
      notConnected: string;
      pageTitle: string;
      pageDescription: string;
      back: string;
    };

    help: {
      rowTitle: string;
      rowDescription: string;
      pageTitle: string;
      pageDescription: string;
      back: string;
    };

    profile: {
      pageTitle: string;
      loading: string;
      languageLearner: string;
      accountFallback: string;
      changePhoto: string;
      addPhoto: string;
      removePhoto: string;
      loadingProfile: string;
      profile: string;
      yourName: string;
      namePlaceholder: string;
      exchangeId: string;
      exchangeIdDescription: string;
      exchangeIdPlaceholder: string;
      nativeLanguage: string;
      learningLanguage: string;
      nativeLanguageDescription: string;
      learningLanguageDescription: string;
      saveChanges: string;
      saving: string;
      logout: string;
      logoutDescription: string;
      logoutConfirm: string;
      photoImageError: string;
      photoSizeError: string;
      photoUpdated: string;
      photoUploadError: string;
      loginRequired: string;
      photoRemoved: string;
      photoRemoveError: string;
      profileUpdated: string;
      profileUpdateError: string;
      languagesMustDifferError: string;
      editProfile: string;
      copyHandle: string;
      copied: string;
      viewQr: string;
      checkingAvailability: string;
      idAvailable: string;
      idTaken: string;
      idCheckError: string;
    };

    dailyGoal: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      wordsLabel: string;

      options: {
        three: string;
        five: string;
        ten: string;
        twenty: string;
        thirtyThree: string;
      };
    };

    appLanguage: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      englishDescription: string;
      traditionalChineseDescription: string;
    };

    /*
     * Yumi's own reminder push. Lived inline in the component until the
     * reminder became an inline switch and its diagnostics moved into the
     * Notifications sheet — two components, so one dictionary.
     */
    yumiReminders: {
      rowTitle: string;
      rowDescription: string;
      loadError: string;
      saveError: string;
      timezoneLabel: string;
      testTitle: string;
      testDescription: string;
      test: string;
      testing: string;
      testSent: string;
      testError: string;
    };

    interfaceMode: {
      rowTitle: string;
      rowDescription: string;
      // The full names are the accessible names of the two segments; the
      // short ones are what fits inside them.
      standardTitle: string;
      standardShort: string;
      cosmicTitle: string;
      cosmicShort: string;
      sharedDataNote: string;
    };

    scriptableWidget: {
      rowTitle: string;
      rowDescription: string;
      statusReady: string;
      statusNotConfigured: string;
      statusRevoked: string;
      statusLoading: string;
      statusUnavailable: string;
      sheetTitle: string;
      sheetDescription: string;
      activeTitle: string;
      activeDescription: string;
      emptyTitle: string;
      emptyDescription: string;
      revokedTitle: string;
      revokedDescription: string;
      unavailableTitle: string;
      unavailableDescription: string;
      tokenPrefixLabel: string;
      createdLabel: string;
      lastUsedLabel: string;
      neverUsed: string;
      notAvailable: string;
      oneTimeTitle: string;
      oneTimeDescription: string;
      generate: string;
      generating: string;
      generateSuccess: string;
      rotate: string;
      rotating: string;
      rotateConfirmTitle: string;
      rotateConfirmDescription: string;
      confirmRotate: string;
      revoke: string;
      revoking: string;
      revokeSuccess: string;
      revokeConfirmTitle: string;
      revokeConfirmDescription: string;
      confirmRevoke: string;
      refresh: string;
      close: string;
      copy: string;
      copied: string;
      cancel: string;
      authenticationError: string;
      loadError: string;
      actionError: string;
      copyError: string;
    };

    iphoneWidget: {
      rowTitle: string;
      rowDescription: string;
      statusNative: string;
      sheetTitle: string;
      sheetDescription: string;
      nativeTitle: string;
      nativeDescription: string;
      addTitle: string;
      stepOne: string;
      stepTwo: string;
      stepThree: string;
      stepFour: string;
      behaviorTitle: string;
      behaviorDescription: string;
      openAppNote: string;
      done: string;
    };

    webPush: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      statusOn: string;
      statusOff: string;
      statusLoading: string;
      statusNeedsHomeScreen: string;
      statusUnsupported: string;
      statusBlocked: string;
      statusUnavailable: string;
      enabledTitle: string;
      enabledDescription: string;
      disabledTitle: string;
      disabledDescription: string;
      needsHomeScreenTitle: string;
      needsHomeScreenDescription: string;
      unsupportedTitle: string;
      unsupportedDescription: string;
      blockedTitle: string;
      blockedDescription: string;
      unavailableTitle: string;
      unavailableDescription: string;
      enable: string;
      enabling: string;
      disable: string;
      disabling: string;
      authenticationError: string;
      permissionDismissedError: string;
      subscriptionError: string;
      unsubscribeError: string;
      statusError: string;
      sendTest: string;
      testing: string;
      testDescription: string;
      testSuccess: string;
      testAuthenticationError: string;
      testNoSubscriptionError: string;
      testExpiredError: string;
      testDeliveryError: string;
      testNetworkError: string;
    };

    /*
     * The three sizes are chosen on the row itself now, by a control that
     * shows each size at its own size — so the labels survive as the
     * accessible names of the segments, and the sheet's prose does not.
     */
    fontSize: {
      rowTitle: string;
      rowDescription: string;

      options: {
        small: { label: string };
        medium: { label: string };
        large: { label: string };
      };
    };

    pronunciation: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      readingSpeed: string;
      readingSpeedDescription: string;
      readingSpeedAriaLabel: string;
      slower: string;
      faster: string;
      voice: string;
      voiceDescription: string;
      female: string;
      male: string;
      genderUnavailable: string;
      voicesOnDevice: string;
      voicesOnDeviceDescription: string;
      voiceAutomatic: string;
      noVoicesInstalled: string;
      testVoice: string;
    };
  };
};
