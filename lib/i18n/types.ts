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
    retry: string;
    error: string;
  };

  auth: {
    language: {
      eyebrow: string;
      title: string;
      subtitle: string;
      englishTitle: string;
      englishDescription: string;
      traditionalChineseTitle: string;
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
      emailPlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      forgotPassword: string;
      submit: string;
      submitting: string;
      createAccount: string;
      genericError: string;
      changeLanguage: string;
    };
  };

  navigation: {
    vocabulary: string;
    messages: string;
    home: string;
    discover: string;
    settings: string;
  };

  discover: {
    title: string;
    eyebrow: string;
    subtitle: string;

    liveGlobalStories: string;
    dailyNewsTitle: string;
    speechSpeed: string;

    vocabulary: string;
    tapToExpand: string;

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

    sendToFriend: string;
    newStories: string;
    loadingNewStories: string;
    loadNewStoriesAriaLabel: string;
    originalSourceAriaLabel: string;
    sendToFriendAriaLabel: string;
    shareAriaLabel: string;
    listenHeadlineAriaLabel: string;
    listenSummaryAriaLabel: string;
    loginRequiredError: string;
    loadFriendsError: string;
    loadNewsError: string;
    loadNewsRetryError: string;

    loading: string;
    loadingDescription: string;

    emptyTitle: string;
    emptyDescription: string;

    errorTitle: string;
    errorDescription: string;

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
    readMore: string;
    keyWordsLabel: string;
    moreActions: string;
    moreActionsAriaLabel: string;
    openSource: string;
    shareStory: string;
    shareCopied: string;
    hideStory: string;
    save: string;
    listen: string;
    speedSlow: string;
    speedNatural: string;
    speedFast: string;
    vocabularyDrawerTitle: string;
    vocabularyDrawerDescription: string;

    refreshAction: string;
    refreshAriaLabel: string;
    playFullStory: string;
    stopStory: string;
    playFullStoryAriaLabel: string;
    languageEnglish: string;
    languageChinese: string;
    languageEnglishShort: string;
    languageChineseShort: string;

    addToVocabulary: string;
    addedToVocabulary: string;
    addingToVocabulary: string;
    addToVocabularyAriaLabel: string;

    exploreImageLabel: string;
  };

  capture: {
    backToVocabulary: string;
    backToHome: string;
    backToCapture: string;
    eyebrow: string;
    title: string;
    description: string;
    reset: string;
    identify: string;
    identifying: string;

    progress: {
      ariaLabel: string;
      photo: string;
      analyze: string;
      review: string;
      save: string;
    };

    source: {
      eyebrow: string;
      title: string;
      description: string;
      takePhoto: string;
      useCamera: string;
      chooseImage: string;
      photoLibrary: string;
      cameraStarting: string;
      unsupported: string;
    };

    camera: {
      cancel: string;
      captureAriaLabel: string;
      closeCameraAriaLabel: string;
      selectedObjectAlt: string;
      selectedImage: string;
      analyzeAgain: string;
      chooseAnother: string;
      focusHint: string;
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
      loadingPartners: string;
      sendToPartner: string;
    };

    categories: {
      people: string;
      objects: string;
      actions: string;
      other: string;
    };

    partners: {
      eyebrow: string;
      title: string;
      closeAriaLabel: string;
    };

    errors: {
      openSelectedImage: string;
      cameraPermissionDenied: string;
      noCamera: string;
      cameraInUse: string;
      cameraUnavailable: string;
      cameraPreview: string;
      readImage: string;
      openImage: string;
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
      noPartners: string;
      loadPartners: string;
      sendWord: string;
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
      sectionTitle: string;
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
      playEnglishExampleAriaLabel: string;
      playChineseExampleAriaLabel: string;
      previousWord: string;
      nextWord: string;
      swipeHint: string;
      positionLabel: string;
    };

    quickStart: {
      eyebrow: string;
      title: string;
      review: string;
      capture: string;
      loadingWords: string;
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
      openReview: string;
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
      showTrapDetails: string;
      hideTrapDetails: string;
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
      sleepingAriaLabel: string;
    };
  };

  messages: {
    title: string;
    searchPlaceholder: string;
    loadingConversations: string;
    loadingMessages: string;
    today: string;
    yesterday: string;
    removeFriendConfirm: string;
    inputPlaceholder: string;
    backToMessages: string;
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
    analyzingAndSending: string;
    send: string;
    selectMessages: string;
    delete: string;
    deleting: string;
    cancel: string;
    deleteFriend: string;
    deleteMessage: string;
    deleteMessages: string;
    english: string;
    traditionalChinese: string;

    youPrefix: string;
    attachmentLabel: string;
    voiceLabel: string;
    sharedArticleLabel: string;
    muted: string;
    muteConversation: string;
    unmuteConversation: string;
    noConversationsFound: string;
    typingIndicator: string;
    statusSending: string;
    statusSent: string;
    statusDelivered: string;
    statusRead: string;

    moodSwipeHint: string;
    moodCalm: string;
    moodCurious: string;
    moodSleepy: string;
    moodSurprised: string;
    moodHappy: string;

    errors: {
      notLoggedIn: string;
      loadConversations: string;
      removeFriend: string;
      noMessagesDeleted: string;
      partialDelete: string;
      deleteSelected: string;
      shareWord: string;
      openConversation: string;
      saveWord: string;
      updateConversation: string;
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
      loginToGetCode: string;
    };

    incoming: {
      title: string;
      empty: string;
      accept: string;
      decline: string;
      responding: string;
      wantsToConnect: string;
    };

    outgoing: {
      title: string;
      empty: string;
      pending: string;
      cancel: string;
      cancelling: string;
      waitingForResponse: string;
    };

    list: {
      title: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
    };

    banners: {
      loginFirst: string;
      enterExchangeId: string;
      profileNotFound: string;
      ownExchangeId: string;
      alreadyFriends: string;
      alreadyPending: string;
      requestSent: string;
      sendFailed: string;
      respondFailed: string;
      cancelFailed: string;
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
      statWordsToday: string;
      statCookies: string;
      statStreak: string;
      statStreakDays: string;
      statMood: string;
      summaryWordSingular: string;
      summaryWordPlural: string;
      summaryCookieSingular: string;
      summaryCookiePlural: string;
      summaryStreak: string;
      cookieTrayEmpty: string;
      cookieTrayHint: string;
      cookieTrayMore: string;
      feedAriaLabel: string;
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
      reviewLinkLabel: string;
      collectionsLinkLabel: string;
    };

    lookup: {
      title: string;
      placeholder: string;
      search: string;
      searching: string;
      description: string;
      error: string;
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
      suggestions: string;
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
        food: string;
        fashion: string;
        travel: string;
        work: string;
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

      learningProgress: string;
      accuracy: string;
      reviews: string;
      nextReview: string;
      starsAriaLabel: string;

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
        interval: string;
        day: string;
        days: string;
        ease: string;
      };

      edit: {
        title: string;
        subtitle: string;
        english: string;
        traditionalChinese: string;
        englishPlaceholder: string;
        chinesePlaceholder: string;
        englishExample: string;
        chineseExample: string;
        englishExamplePlaceholder: string;
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
        loginToView: string;
        loginToEdit: string;
        loadError: string;
        notFound: string;
        unavailable: string;
        deleteWord: string;
        deleteConfirm: string;
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
      openLibrary: string;
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
    backReview: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    today: string;
    cardsReady: string;
    introLineOne: string;
    introLineTwo: string;
    startReview: string;
    freePractice: string;
    freePracticeDescription: string;
    practiceAllWords: string;
    noWordsTitle: string;
    noWordsDescription: string;
    addWords: string;
    practiceEyebrow: string;
    practiceTitle: string;
    queueData: string;
    ready: string;
    loadingQueue: string;
    system: string;
    loadError: string;
    retry: string;
    caughtUpTitle: string;
    caughtUpDescription: string;
    sessionEyebrow: string;
    sessionTitle: string;
    remaining: string;
    progressAriaLabel: string;
    vocabulary: string;
    revealAnswer: string;
    saving: string;
    saveError: string;
    completeEyebrow: string;
    completeTitle: string;
    completeDescription: string;
    completedReviews: string;
    reviewAgain: string;
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
    preferences: string;
    learningSetup: string;

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
      accountDetails: string;
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
      preferences: string;
      account: string;
      logout: string;
      logoutDescription: string;
      logoutConfirm: string;
      photoImageError: string;
      photoSizeError: string;
      loginUploadError: string;
      photoUpdated: string;
      photoUploadError: string;
      loginRequired: string;
      photoRemoved: string;
      photoRemoveError: string;
      loginUpdateError: string;
      exchangeIdLength: string;
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
      minutesLabel: string;

      options: {
        five: string;
        ten: string;
        fifteen: string;
        twenty: string;
        thirty: string;
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

    fontSize: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;

      options: {
        small: {
          label: string;
          description: string;
        };

        medium: {
          label: string;
          description: string;
        };

        large: {
          label: string;
          description: string;
        };
      };
    };

    pronunciation: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      settingsAriaLabel: string;
      readingSpeed: string;
      readingSpeedDescription: string;
      readingSpeedAriaLabel: string;
      slower: string;
      faster: string;
      voice: string;
      voiceDescription: string;
      female: string;
      male: string;
      testVoice: string;
    };
  };
};
