import type { InterfaceLanguage } from "@/lib/appPreferences";

export type TranslationLanguage = InterfaceLanguage;

export type TranslationDictionary = {
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

    vocabulary: string;
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
  };

  capture: {
    backToVocabulary: string;
    backToHome: string;
    backToCapture: string;
    eyebrow: string;
    title: string;
    description: string;
    reset: string;

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
      selectedObjectAlt: string;
      selectedImage: string;
      analyzeAgain: string;
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
      playSound: string;
      playWord: string;
      correct: string;
      incorrect: string;
      commonMistake: string;
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

    errors: {
      notLoggedIn: string;
      loadConversations: string;
      removeFriend: string;
      noMessagesDeleted: string;
      partialDelete: string;
      deleteSelected: string;
    };
  };
  friends: {
    backHome: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    loginRequired: string;

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
    };

    collections: {
      title: string;
      description: string;
      backToVocabulary: string;
      createCollection: string;
      createCollectionAria: string;
      loadingError: string;
      createError: string;
      emptyTitle: string;
      emptyDescription: string;
      suggestions: string;
      listAriaLabel: string;
      newCollection: string;
      close: string;
      emojiLabel: string;
      namePlaceholder: string;
      creating: string;
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
        emptyTitle: string;
        emptyDescription: string;
        browseVocabulary: string;
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
      closeSortMenu: string;

      sortOptions: {
        new: string;
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
    };

    appLanguage: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      englishDescription: string;
      traditionalChineseDescription: string;
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
