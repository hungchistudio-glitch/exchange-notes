import type { InfoCopy } from "@/lib/i18n/info/types";
import type { InterfaceLanguage } from "@/lib/appPreferences";

/**
 * Dictionaries are keyed by interface language, so this equation is correct
 * — and confined to the interface axis. Do not extend it to the learning
 * language: a user learning Spanish can independently read the app in French,
 * and dictionaries are selected by `InterfaceLanguage`, not `LanguageCode`
 * (lib/languages.ts).
 */
export type TranslationLanguage = InterfaceLanguage;

/** One scene of the landing page's YU + MI = Yumi film. */
export type StoryAct = { name: string; title: string; text: string };

export type TranslationDictionary = {
  info: InfoCopy;
  /**
   * What the app says when there is no network.
   *
   * Its own section rather than strings scattered through the screens that
   * need them: being offline is one state, and a reader who meets it on
   * three screens should be told the same thing three times, not three
   * different things.
   */
  offline: {
    title: string;
    body: string;
    needsConnection: string;
    pendingOne: string;
    pendingMany: string;
    savedLocally: string;
  };
  /** What a link to the app or its introduction says when it leaves the app: page titles, link previews and the install description. */
  meta: {
    landingTitle: string;
    landingDescription: string;
    appDescription: string;
  };
  /** The page shown for an address that does not exist. */
  notFound: {
    title: string;
    description: string;
    home: string;
  };
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
  /**
   * The public product introduction shown before sign-in.
   *
   * This belongs in the same dictionary as the app itself: the introduction
   * is the first interface a new reader meets, so leaving it as hand-written
   * English and Chinese copy makes the language picker arrive one screen too
   * late for Spanish, French and Italian readers.
   */
  landing: {
    navigation: {
      ariaLabel: string;
      homeAriaLabel: string;
      start: string;
      opening: string;
    };
    languagePicker: {
      label: string;
      ariaLabel: string;
      loadError: string;
    };
    hero: {
      eyebrow: string;
      title: string;
      intro: string;
      /** The line under the button: what it costs and what it is not. */
      promise: string;
      /** Each trial step's heading and what it is for. */
      tour: {
        keepTitle: string;
        keepDescription: string;
        understandTitle: string;
        understandDescription: string;
        exchangeTitle: string;
        exchangeDescription: string;
        reviewTitle: string;
        reviewDescription: string;
      };
      /**
       * The hero's trial: the four steps done for real on one phrase, before
       * sign-in. Interface words only; the phrase in five languages is
       * content, in lib/landing/trialPhrases.ts.
       */
      trial: {
        title: string;
        hint: string;
        stepsLabel: string;
        tabs: { keep: string; understand: string; exchange: string; review: string };
        /** {step}. */
        nextStep: string;
        keep: { whereLabel: string; save: string; saved: string; update: string };
        /** remove: {phrase}. */
        notebook: { title: string; empty: string; remove: string };
        listen: {
          play: string;
          playing: string;
          voice: string;
          automatic: string;
          speed: string;
          natural: string;
          slow: string;
          unsupported: string;
          /** {language}. */
          noVoice: string;
        };
        compare: { title: string; label: string };
        exchange: {
          cardLabel: string;
          cardFooter: string;
          copy: string;
          copied: string;
          copyFailed: string;
          share: string;
          replyTitle: string;
          /** {word}. */
          keepWord: string;
          /** {word}. */
          keptWord: string;
        };
        review: {
          empty: string;
          keepAndReview: string;
          /** {n} and {total}. */
          progress: string;
          prompt: string;
          reveal: string;
          again: string;
          gotIt: string;
          /** What the app's scheduler does with "again": ten minutes. */
          againResult: string;
          /** And with a first "good": a day, then longer. */
          gotItResult: string;
          next: string;
          done: string;
          restart: string;
        };
      };
      cta: string;
      ctaLoading: string;
      /**
       * One phrase's journey, the hero's example. The phrase is in a
       * language other than the reader's, so every reader meets a foreign
       * word; each language picks its own.
       */
      journey: {
        phrase: string;
        /** BCP-47, for the phrase and its reading. */
        phraseLang: string;
        reading: string;
        keep: {
          /** Where it was met: the trial's editable default. */
          where: string;
          whyLabel: string;
          why: string;
        };
        understand: {
          label: string;
          meaningLabel: string;
          meaning: string;
          toneLabel: string;
          tone: string;
          cultureLabel: string;
          culture: string;
          equivalentLabel: string;
          equivalent: string;
        };
        exchange: {
          friend: string;
          reply: string;
          replyWord: string;
          /** BCP-47 for replyWord. */
          replyLang: string;
          /** What replyWord means, in the reader's language. */
          replyMeaning: string;
          insight: string;
        };
      };
    };
    /** YU + MI = Yumi: the origin film under the hero. */
    story: {
      eyebrow: string;
      title: string;
      intro: string;
      ariaLabel: string;
      play: string;
      pause: string;
      replay: string;
      chaptersLabel: string;
      /** {n} and {total}. */
      sceneLabel: string;
      acts: [StoryAct, StoryAct, StoryAct, StoryAct, StoryAct];
      tryOn: {
        title: string;
        hint: string;
        takeOff: string;
        /** {n}. */
        cookies: string;
      };
      endTitle: string;
      endText: string;
    };
    notes: {
      eyebrow: string;
      title: string;
      description: string;
      previewAriaLabel: string;
      date: string;
      /**
       * BCP-47 for the language the note opens in (the reader's own, or
       * Chinese for English readers). The sentences themselves are content,
       * in lib/landing/noteSamples.ts.
       */
      translationLang: string;
      privateNote: string;
      viewLabel: string;
      listen: string;
      playing: string;
      listenSentence: string;
      lookupHint: string;
      close: string;
      /** The feeling the note's word names, in the reader's language. */
      meaning: string;
    };
    exchange: {
      eyebrow: string;
      title: string;
      description: string;
      previewAriaLabel: string;
      you: string;
      friend: string;
      /** The note's word, carried on: in a language that is not the reader's. */
      word: string;
      /** BCP-47 for word. */
      wordLang: string;
      reading: string;
      meaning: string;
      /** {friend}. */
      send: string;
      /** {friend}. */
      sent: string;
      waiting: string;
      arrived: string;
      save: string;
      /** {friend}. */
      saved: string;
      again: string;
      listen: string;
      playing: string;
    };
    yumi: {
      eyebrow: string;
      title: string;
      description: string;
      previewAriaLabel: string;
      message: string;
      translation: string;
      /** The same word the note and the exchange carry. */
      reviewWord: string;
      /** BCP-47 for reviewWord. */
      reviewLang: string;
      reviewReading: string;
      reviewMeaning: string;
      reviewHint: string;
      reveal: string;
      again: string;
      gotIt: string;
      /** What the app's scheduler does with a first "good": a day, then longer. */
      gotItReaction: string;
      /** And with "again": ten minutes. */
      againReaction: string;
      restart: string;
      touchHint: string;
      listen: string;
      playing: string;
    };
    lens: {
      eyebrow: string;
      title: string;
      subtitle: string;
      pickerAriaLabel: string;
      previewAriaLabel: string;
      listen: string;
      playing: string;
      cosmicBadge: string;
      menu: {
        label: string;
        blurb: string;
        detailOne: string;
        detailTwo: string;
        detailThree: string;
        demoSource: string;
        demoName: string;
        demoIpa: string;
        demoPrice: string;
        demoSecondSource: string;
        demoSecondName: string;
        demoSecondPrice: string;
        demoSecondIpa: string;
        hint: string;
        demoConfidence: string;
      };
      target: {
        label: string;
        blurb: string;
        detailOne: string;
        detailTwo: string;
        detailThree: string;
        demoSelected: string;
        demoCandidate: string;
        /** What each of the three frames reads as: the big middle frame first, and chosen. */
        demoOptions: [string, string, string];
        hint: string;
      };
    };
    closing: {
      title: string;
      titleSecond: string;
      description: string;
      cta: string;
      ctaLoading: string;
    };
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
      loadError: string;
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
    /** A long text cut to a few lines, and the key that shows all of it. */
    showFullText: string;
    showLess: string;
  };

  /** The sheet every "send to a partner" flow opens to pick a friend. */
  friendPicker: {
    title: string;
    retry: string;
    empty: string;
    loginRequired: string;
    loadFailed: string;
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
      title: string;
      subtitle: string;
      googleSubtitle: string;
      /** {terms} and {privacy} become links to those pages. */
      legalNotice: string;
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

    /*
     * The tour you do rather than read.
     *
     * The stepped overlay stays for the two things that have to happen
     * before anything else can — welcome, and choosing the two languages —
     * and hands over to this on the home screen, where the rest of it is
     * things the reader performs: open the ring, look a word up, keep it,
     * feed it to her. Each step waits for the real event, so the copy can
     * say "now do it" and mean it.
     */
    coach: {
      label: string;
      /** Ends the whole tour. */
      skip: string;
      /** Moves past one step that waits for something the reader cannot do now. */
      skipStep: string;
      next: string;
      finish: string;
      /** Said once, briefly, when a step is satisfied. */
      done: string;
      /** The door on a home-screen step, when the reader is somewhere else. */
      backHome: string;
      /**
       * Said on the keep step when the lookup came back without a meaning,
       * so there is nothing to keep. Offers another word or the next step
       * instead of waiting for a save that cannot happen.
       */
      unavailable: string;
      /*
       * The tour runs in chapters: Home and Around the app in Standard Mode,
       * then The other look in Cosmic. `label` takes {chapter}, {name},
       * {current} and {total}.
       */
      chapters: { home: string; pages: string; shop: string; cosmic: string };
      /**
       * The label on the steps shown to a reader who finished an earlier
       * edition of the tour: only what is new. Takes {current} and {total}.
       */
      whatsNew: string;
      /** A step that needs the other interface mode, and the key that switches. */
      needsStandard: string;
      toStandard: string;
      needsCosmic: string;
      toCosmic: string;
      /** The two keys on the final step. */
      useStandard: string;
      useCosmic: string;
      steps: {
        /** Opening the dial and turning it; only a tap on a key goes in. */
        meet: { body: string };
        ask: { body: string };
        /**
         * Saving, and the two things a new word earns: a cookie on Home to
         * feed Yumi, and an energy cookie for the shop.
         */
        /** tag: the few words on the light over the search sheet's Save. */
        keep: { body: string; tag: string };
        /** tag: the few words on the light over a cookie card's "Feed Yumi". */
        feed: { body: string; tag: string };
        /*
         * The page steps. `action` labels the door that takes the reader
         * there when they are not on that page yet; the body is what is said
         * once they are.
         */
        library: { body: string; action: string };
        review: { body: string; action: string };
        pronunciation: { body: string; action: string };
        share: { body: string; action: string };
        notes: { body: string; action: string };
        discover: { body: string; action: string };
        settings: { body: string; action: string };
        /* The shop: what cookies are for (on Home, at the shop key), then
           trying a piece on and how buying works, together. */
        cookies: { body: string };
        tryOn: { body: string; action: string };
        /*
         * Chapter four. Bodies may name things with {standard}, {cosmic},
         * {omni}, {lexicon}, {mission}, {scanner}, {comms}, {earth} and
         * {memory}, filled from the app's own dictionary so the tour always
         * calls a thing what the screen calls it.
         */
        modeSwitch: { body: string };
        /** The whole deck in one card. */
        deck: { body: string };
        choose: { body: string };
      };
    };

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
    };
  };

  navigation: {
    vocabulary: string;
    messages: string;
    home: string;
    discover: string;
    settings: string;
    /** The dock's centre slot, everywhere except the home screen itself. */
    search: string;
    /* Two sections the dock never had a key for. The ring does: notes was
       reachable only from one link on the home screen, and the speech lab
       only from a home module. */
    notes: string;
    pronunciation: string;
    /** The ring's eighth key, and the panel's. Not /pronunciation/review. */
    review: string;
    /** The dock's fifth key: everything that is not one of the other four. */
    allFeatures: string;
    /** Reached through Messages and the sheet; it is not Messages. */
    friends: string;
    primaryLabel: string;
  };

  /*
   * The Universal Lexicon — one field for "what is this?", wherever the
   * reader is standing.
   *
   * Shared word for word by every search surface. The inline home field, the
   * app-wide sheet and the Cosmic OmniLexicon differ in what they draw and in
   * nothing they say, so a sentence written once here is used everywhere.
   */
  lexicon: {
    open: string;
    fieldPlaceholder: string;
    /** Takes the learning language's own localized name. */
    fieldPlaceholderLanguage: string;
    fieldHint: string;
    inputAriaLabel: string;

    modeType: string;
    modeVoice: string;
    modeCamera: string;
    modeImage: string;

    search: string;
    clear: string;
    close: string;
    cancel: string;

    emptyTitle: string;
    emptyDescription: string;
    searching: string;
    /** Shown while a busy model is waited out before one more try. */
    retrying: string;
    /**
     * Every AI model has used today's quota. {time} is when it comes back,
     * already formatted for the reader's locale and time zone.
     */
    quotaTitle: string;
    quotaDetail: string;
    listening: string;
    offlineTitle: string;
    offlineDescription: string;
    errorTitle: string;
    errorDescription: string;
    lookupFailedError: string;
    signInError: string;
    tooLongError: string;
    retry: string;

    yourVocabulary: string;
    dictionary: string;
    savedOn: string;
    openWord: string;
    reviewWord: string;
    listen: string;

    save: string;
    saving: string;
    saved: string;
    alreadySaved: string;
    alreadySavedDescription: string;
    openSavedWord: string;
    noTranslation: string;
    noTranslationDetail: string;
    dailyLimitTitle: string;
    dailyLimitDetail: string;
    degradedNotice: string;
    lowConfidence: string;
    basicTranslation: string;
    onDevicePending: string;
    onDeviceFinal: string;
    example: string;
    share: string;
    /** Shown in place of `share` when the text went to the clipboard. */
    copied: string;
    send: string;

    languageLabel: string;
    changeLanguage: string;
    chooseLanguage: string;
    chooseLanguageDescription: string;

    sentenceTitle: string;
    phraseTitle: string;
    translationTitle: string;
    worthKeeping: string;
    /** Takes the phrase itself. */
    savePhrase: string;
    sentenceNotSavable: string;

    /** The microphone, while it listens and while Yumi works out what was said. */
    voice: {
      listening: string;
      /** Under the caption: how to finish. */
      listeningHint: string;
      understanding: string;
      stop: string;
      noSpeech: string;
      notUnderstood: string;
      unavailable: string;
      limit: string;
      micDenied: string;
    };

    /** Yumi's reading of a sentence. */
    insight: {
      title: string;
      more: string;
      less: string;
      literal: string;
      tone: string;
      implied: string;
      context: string;
      phrases: string;
    };

    onboardingTitle: string;
    onboardingDescription: string;
    onboardingDismiss: string;
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
      edition: string;
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
      /*
       * Two ways of not understanding a language, chosen by the language
       * rather than by which of two it is. A script you cannot sound out is
       * something you *saw*; one you can read but not follow is something you
       * *heard*. Both take the language's own localized name.
       */
      placeholderUnreadable: string;
      placeholderHeard: string;
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
      /** Shown when the history has loaded and holds no reviews at all. */
      noReadings: string;
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
    notGeneratedError: string;

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
    sendToPartnerError: string;

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
      art: string;
      fashion: string;
      environment: string;
      politics: string;
      general: string;
      taiwan: string;
    };

    latestStoriesLabel: string;
    keyWordsLabel: string;
    keyWordsLabelOne: string;
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
    wordAlreadySaved: string;
    wordAlreadySavedAriaLabel: string;
    saveWordError: string;
    saveWordLoginError: string;

    exploreImageLabel: string;
    exploreImageLabelOne: string;
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
      /*
       * The target camera's own vocabulary. `focusHint` and `opening` went
       * with the overlay this replaced: there is no separate "opening the
       * camera" screen any more (the camera paints its own black from the
       * first frame), and the fixed centre reticle became a target the
       * reader chooses.
       */
      torchOn: string;
      torchOff: string;
      importFile: string;
      zoom: string;
      /** Carries {level}, already formatted — "0.5", "1", "2.4". */
      zoomLevel: string;
      targetHint: string;
      selectedTarget: string;
      candidateTarget: string;
      focused: string;
      /*
       * Without a trailing ellipsis. AnalysingTargetIndicator draws the dots
       * itself and animates them one at a time, so a "…" written into the
       * string here would render as "Analysing target…..." and would make
       * the pill jump as the animated ones cycled.
       */
      analysing: string;
      /** On a frozen frame nothing could be read from. */
      retake: string;
      retry: string;
      confirmTarget: string;
      resetZoom: string;
      /* Only ever shown for a source with pages — a document, never a photo. */
      previousPage: string;
      nextPage: string;
      /** Carries {page} and {count}. */
      pageLabel: string;
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
      /** Google's AI is unavailable: {minutes} until it is likely back. */
      identifyGoogleDown: string;
      /** The day's free Google allowance is spent: back at {time}. */
      identifyGoogleQuota: string;
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
    /** The tap that opens the ring, shown until it has been used once. */
    yumiHint: string;
    panelTitle: string;
    panelLearning: string;
    panelDiscover: string;
    panelPeople: string;
    panelMine: string;
    toolCapture: string;
    toolMenu: string;
    yumiPanelTitle: string;

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
      carouselRole: string;
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
      totalReviewsOne: string;
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
      recentTitle: string;
      viewAll: string;
      composerTitle: string;
      composerDescription: string;
      originalLabel: string;
      originalPlaceholder: string;
      languageLabel: string;
      detectedHint: string;
      personalMeaning: string;
      personalMeaningPlaceholder: string;
      contextLabel: string;
      contextPlaceholder: string;
      tagsLabel: string;
      tagsPlaceholder: string;
      sourceLabel: string;
      sourcePlaceholder: string;
      privateLabel: string;
      privateDescription: string;
      saveError: string;
      libraryTitle: string;
      libraryDescription: string;
      searchPlaceholder: string;
      allNotes: string;
      mine: string;
      sharedWithMe: string;
      noResults: string;
      retry: string;
      loadError: string;
      detailEyebrow: string;
      viewIn: string;
      yumiTitle: string;
      yumiDescription: string;
      interpret: string;
      interpreting: string;
      interpretError: string;
      naturalTranslation: string;
      meaning: string;
      localExpressions: string;
      tone: string;
      culturalNuance: string;
      usageExamples: string;
      warnings: string;
      sharedBy: string;
      saveToMyNotes: string;
      savedToMyNotes: string;
      saveCopyError: string;
      shareTitle: string;
      shareDescription: string;
      noFriends: string;
      viewOnly: string;
      shareError: string;
      deleteConfirm: string;
    };
  };

  /**
   * The /speak page — the one the Scriptable widget and a shared link open.
   *
   * Public, so its copy follows the interface language stored on the device
   * rather than a profile. What it says a word *in* comes from the link.
   */
  speakPage: {
    eyebrow: string;
    noText: string;
    ready: string;
    playing: string;
    complete: string;
    blocked: string;
    playAgain: string;
    openLab: string;
    backToVocabulary: string;
    badge: string;
  };

  pronunciation: {
    backToVocabulary: string;
    backHome: string;
    title: string;
    subtitle: string;

    cards: {
      howToSayIt: string;
      playWord: string;
      correct: string;
      incorrect: string;
      commonMistake: string;
      showMoreGuidance: string;
      showLessGuidance: string;
      commonTrapSummary: string;
      playbackFailed: string;
    };

    yumi: {
      mouth: string;
      tongue: string;
      airflow: string;
      voice: string;
      demoAriaLabel: string;
      tapToHear: string;
    };

    /**
     * The other readings of a headword (components/pronunciation/OtherReadings).
     * summary: {count}; summaryCharacter: {character}, {count}; play: {example}.
     */
    heteronyms: { summary: string; summaryCharacter: string; show: string; hide: string; usedHere: string; play: string; suggested: string };

    /**
     * The Pronunciation Lab.
     *
     * Chrome only — every string here names a control, a state or a heading.
     * The teaching material itself (what a sound is, how to make it, which
     * words contain it) lives in the language packs under
     * lib/pronunciation/lab/packs, deliberately apart from this: a lesson
     * about Spanish trills is content in one language, and this is the app
     * speaking in whichever language the reader chose.
     */
    lab: {
      backToLab: string;
      learningLabel: string;
      switchLanguageHint: string;

      coach: {
        eyebrow: string;
        calibratedFor: string;
        idle: string;
        demonstrating: string;
        listening: string;
        recording: string;
        analyzing: string;
        correct: string;
        almost: string;
        incorrect: string;
        celebrating: string;
        encouraging: string;
        waiting: string;
      };
      /**
       * Yumi's articulation timeline (lib/pronunciation/articulationTimeline.ts):
       * what each moment of a word is, where it is made, and what to watch for.
       * position: {current}, {total}.
       */
      timeline: {
        title: string;
        estimated: string;
        empty: string;
        tapHint: string;
        previous: string;
        next: string;
        position: string;
        focus: string;
        legend: { voice: string; silence: string; burst: string; friction: string; pitch: string };
        stages: { closure: string; burst: string; aspiration: string; friction: string; shape: string; glide: string; tap: string; trill: string; glottal: string; pause: string };
        shapes: { vowel: string; nasal: string; lateral: string; approximant: string };
        places: { bilabial: string; labiodental: string; dental: string; alveolar: string; postalveolar: string; retroflex: string; palatal: string; velar: string; uvular: string; glottal: string };
        vowel: { close: string; mid: string; open: string; front: string; central: string; back: string };
        notes: { unaspirated: string; aspirated: string; voicedClosure: string; voiced: string; voiceless: string; geminate: string; longVowel: string; shortVowel: string; reduced: string; rounded: string; spread: string; nasalVowel: string; nasalAir: string; lateral: string; noTouch: string; retroflexTip: string; apical: string; dentalTip: string; uvular: string; glide: string; tapOnce: string; trillRelax: string; glottalStop: string; linked: string; finalStop: string; stressed: string; tone1: string; tone2: string; tone3: string; tone4: string; tone5: string; halfThird: string; sandhi: string };
      };
      /**
       * The Lab's one-spelling-several-readings module (ReadingsModule).
       * correct, incorrect: {example}; result: {correct}, {total}; count: {count}.
       */
      readings: { title: string; subtitle: string; compare: string; quiz: string; playAll: string; question: string; listenAgain: string; correct: string; incorrect: string; next: string; result: string; again: string; empty: string; count: string };

      modules: {
        sounds: { title: string; description: string };
        listen: { title: string; description: string };
        speak: { title: string; description: string };
        words: { title: string; description: string };
        rhythm: { title: string; description: string };
        review: { title: string; description: string };
        readings: { title: string; description: string };
      };

      today: {
        eyebrow: string;
        title: string;
        minutes: string;
        start: string;
        resume: string;
        completed: string;
        empty: string;
      };

      progress: {
        eyebrow: string;
        title: string;
        sounds: string;
        listening: string;
        speaking: string;
        rhythm: string;
        notEnough: string;
        soundsMastered: string;
        practisedCount: string;
      };

      mastery: {
        new: string;
        learning: string;
        improving: string;
        mastered: string;
      };

      weakness: {
        title: string;
        description: string;
        strong: string;
        improving: string;
        needsWork: string;
        empty: string;
        viewAll: string;
        attempts: string;
      };

      sounds: {
        title: string;
        subtitle: string;
        all: string;
        empty: string;
        soundCount: string;
      };

      detail: {
        articulation: string;
        examples: string;
        minimalPairs: string;
        recordYourself: string;
        practiceAgain: string;
        nativeSpeed: string;
        slowSpeed: string;
        replay: string;
        tongue: string;
        lips: string;
        jaw: string;
        airflow: string;
        voicing: string;
        resonance: string;
        writtenAs: string;
        difficulty: string;
        notFound: string;
      };

      listen: {
        title: string;
        subtitle: string;
        prompt: string;
        playAgain: string;
        next: string;
        finish: string;
        correct: string;
        incorrect: string;
        empty: string;
        roundOf: string;
      };

      speak: {
        title: string;
        subtitle: string;
        listenFirst: string;
        record: string;
        stop: string;
        recording: string;
        analyzing: string;
        retry: string;
        continueLabel: string;
        native: string;
        you: string;
        compare: string;
        playNative: string;
        playYours: string;
        overall: string;
        notAnalyzed: string;
        notAnalyzedHint: string;
        privacyCloud: string;
        privacyOnDevice: string;
        heard: string;
        permissionDenied: string;
        permissionHelp: string;
        unsupported: string;
        unsupportedHelp: string;
        noAudio: string;
        failed: string;
        empty: string;
      };

      dimensions: {
        sound: string;
        vowel: string;
        consonant: string;
        consonantLength: string;
        stress: string;
        rhythm: string;
        fluency: string;
        tone: string;
        pitch: string;
        nasal: string;
        liaison: string;
        melody: string;
      };

      words: {
        title: string;
        subtitle: string;
        empty: string;
        emptyHint: string;
        addWords: string;
        practise: string;
        reasonWeak: string;
        reasonDifficult: string;
        reasonNew: string;
        reasonRecent: string;
        drills: string;
      };

      rhythm: {
        title: string;
        subtitle: string;
        rule: string;
        primaryStress: string;
        secondaryStress: string;
        linked: string;
        held: string;
        toneLabel: string;
        empty: string;
      };

      review: {
        title: string;
        subtitle: string;
        due: string;
        nothingDue: string;
        nothingDueHint: string;
        start: string;
      };

      session: {
        stepOf: string;
        skip: string;
        next: string;
        finish: string;
        complete: string;
        completeBody: string;
        backToLab: string;
        resumeTitle: string;
        resumeBody: string;
        resume: string;
        startOver: string;
        leaveConfirm: string;
      };

      states: {
        loading: string;
        error: string;
        errorBody: string;
        retry: string;
        signedOut: string;
        signedOutBody: string;
        notSaved: string;
        audioUnavailable: string;
      };
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
    /** A shared news card's labels, in the reader's own language. */
    newsCardEyebrow: string;
    newsCardVocabulary: string;
    /** The inbox and push preview for a card that could not be read. */
    sharedWordCardPreview: string;
    sharedNewsCardPreview: string;
    /** Notifications, written in the recipient's language, not the sender's. */
    push: {
      newMessage: string;
      friendRequest: string;
      friendRequestGeneric: string;
      friendAccepted: string;
      friendAcceptedGeneric: string;
    };
    voiceLabel: string;
    muted: string;
    muteConversation: string;
    unmuteConversation: string;
    /** On a conversation row whose other person is no longer a friend. */
    historyOnlyTag: string;
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
      tones: {
        /** One per key in TONE_KEYS (lib/messages/decode.ts). */
        casual: string;
        friendly: string;
        warm: string;
        playful: string;
        teasing: string;
        excited: string;
        grateful: string;
        apologetic: string;
        polite: string;
        formal: string;
        serious: string;
        annoyed: string;
        worried: string;
        sad: string;
        sarcastic: string;
      };
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
      loadOlder: string;
      historyOnly: string;
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
    selection: {
      addWord: string;
      addedWord: string;
      sendToPartner: string;
      saveFailed: string;
      alreadySaved: string;
      sendFailed: string;
    };
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
      summaryStreakOne: string;
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
      unsavedTitle: string;
      noMatchingTitle: string;
      unsavedDescription: string;
      noMatchingDescription: string;
      lookUpWord: string;
      shareWithFriend: string;
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
      copyWordAriaLabel: string;
      copiedAriaLabel: string;
      dialogLabel: string;
      deleteConfirm: string;
      updateError: string;
      deleteError: string;
      libraryLoadError: string;
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
        wordPlaceholder: string;
        translationPlaceholder: string;
        exampleLabel: string;
        examplePlaceholder: string;
        close: string;
        cancel: string;
        save: string;
        saving: string;
        required: string;
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

    /*
     * The vocabulary language axis, as it appears on screen.
     *
     * Separate from every other language string in this dictionary because it
     * is about a *different* axis: these name the language a saved word is
     * in, which has nothing to do with the language this dictionary is
     * written in. A Chinese interface says 「法文」 above a card that still
     * reads "tondre".
     */
    language: {
      title: string;
      allLanguages: string;
      filterAriaLabel: string;
      badgeAriaLabel: string;
      emptyTitle: string;
      emptyDescription: string;
      change: string;
      changeTitle: string;
      changeDescription: string;
      changeAriaLabel: string;
      unclear: string;
      savedAs: string;
      close: string;
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
      };

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
    completedReviewsOne: string;
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

  /*
   * The Menu Translator. The deck's camera node stopped being "a camera" and
   * became the one thing worth pointing a camera at that this app can do
   * better than the phone's own: reading a menu you cannot read.
   */
  scanner: {
    back: string;

    menu: {
      title: string;
      cameraHint: string;
      detecting: string;
      detected: string;
      capture: string;
      close: string;
      torchOn: string;
      torchOff: string;
      gallery: string;
      importFailed: string;
      targetLanguage: string;
      cameraPermissionDenied: string;
      cameraUnavailable: string;
      cameraRetry: string;

      qualityTitle: string;
      qualityBody: string;
      retake: string;
      continueAnyway: string;

      phaseReading: string;
      phaseUnderstanding: string;
      phaseTranslating: string;
      phaseFinishing: string;
      processingHint: string;
      cancel: string;

      modeRebuilt: string;
      modeTranslated: string;
      modeOriginal: string;
      modeList: string;
      viewMode: string;

      itemCount: string;
      itemCountOne: string;
      sourceLanguage: string;
      unknownLanguage: string;
      partialTitle: string;
      partialBody: string;
      rebuildUnavailable: string;
      lowConfidence: string;
      noPrice: string;
      untitledSection: string;

      notMenuTitle: string;
      notMenuBody: string;
      emptyTitle: string;
      emptyBody: string;
      errorTitle: string;
      tryAgain: string;
      scanAnother: string;
      /** Google's AI unavailable: {minutes} until it is likely back. */
      googleDown: string;
      /** The day's free Google allowance is spent: back at {time}. */
      googleQuota: string;
      timeoutBody: string;
      busyBody: string;
      dailyLimitBody: string;
      offlineBody: string;

      zoomIn: string;
      zoomOut: string;
      zoomLevel: string;
      overlayHint: string;

      originalLabel: string;
      priceLabel: string;
      aboutLabel: string;
      cuisineLabel: string;
      cuisines: {
        /** One per key in CUISINE_KEYS (lib/scanner/menuTypes.ts). */
        japanese: string;
        chinese: string;
        taiwanese: string;
        korean: string;
        thai: string;
        vietnamese: string;
        indian: string;
        italian: string;
        french: string;
        spanish: string;
        mexican: string;
        american: string;
        mediterranean: string;
        middleEastern: string;
        cafe: string;
        bakery: string;
        seafood: string;
        vegetarian: string;
        fusion: string;
      };
      listen: string;
      listening: string;
      saveWord: string;
      saving: string;
      saved: string;
      saveFailed: string;
      share: string;
      shareLoginRequired: string;
      friendsError: string;
      confidenceNote: string;
      askRestaurant: string;
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
      deleteAccount: string;
      deleteAccountDescription: string;
      deleteAccountWarning: string;
      deleteAccountKept: string;
      deleteAccountUnderstood: string;
      deleteAccountAction: string;
      deleteAccountDone: string;
      deleteAccountError: string;
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
      cropTitle: string;
      cropDescription: string;
      cropViewportLabel: string;
      cropZoom: string;
      cropConfirm: string;
      cropSaving: string;
      cropCancel: string;
      cropError: string;
      editProfile: string;
      copyHandle: string;
      copied: string;
      viewQr: string;
      checkingAvailability: string;
      idAvailable: string;
      idTaken: string;
      idCheckError: string;
      loadError: string;
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
      heavyNote: string;
    };

    appLanguage: {
      rowTitle: string;
      rowDescription: string;
      sheetTitle: string;
      sheetDescription: string;
      loadError: string;
      /**
       * One line per interface language, keyed by the language itself.
       *
       * A Record rather than englishDescription / spanishDescription / … so
       * the compiler asks for the new one when a language ships. The picker
       * used to fall through an if-chain to the English description, which
       * meant a new language silently described itself as English.
       */
      descriptions: Record<TranslationLanguage, string>;
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

      /*
       * The push itself, not the screen that configures it.
       *
       * Here rather than beside the sender because it is copy a reader sees,
       * and every other line Yumi speaks is in these dictionaries. It was
       * hardcoded in two API routes as one bilingual Chinese-and-English
       * string, so a reader whose interface is Spanish and who is learning
       * Italian was reminded in neither.
       */
      pushTitle: string;
      pushBody: string;
    };

    interfaceMode: {
      enterCosmic: string;
      returnStandard: string;
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
      testBody: string;
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
  /** The Yumi shop (/shop): energy cookies, try-on and the wardrobe. */
  shop: {
    title: string;
    goBack: string;
    cookiesOne: string;
    cookiesOther: string;
    howEarned: string;
    stage: string;
    hint: string;
    views: string;
    front: string;
    side: string;
    backView: string;
    resetView: string;
    zoomIn: string;
    zoomOut: string;
    stageUnavailable: string;
    tryingOn: string;
    wearing: string;
    ownedBadge: string;
    emptyOwned: string;
    empty: string;
    resetOutfit: string;
    buy: string;
    putOn: string;
    wearingNow: string;
    shortOne: string;
    shortOther: string;
    saveWords: string;
    confirmTitle: string;
    confirmBody: string;
    confirmBuy: string;
    cancel: string;
    bought: string;
    saved: string;
    unownedNote: string;
    closed: string;
    offline: string;
    failed: string;
    retry: string;
    /** The sky behind the stand: its key, its scenes, and the weather it can follow. */
    sky: {
      label: string;
      night: string;
      choices: { auto: string; clear: string; rain: string; snow: string; leaves: string; butterflies: string; stars: string };
      conditions: { clear: string; partly: string; cloudy: string; fog: string; drizzle: string; rain: string; snow: string; storm: string };
      seasons: { spring: string; summer: string; autumn: string; winter: string };
    };
    /** The orbital station the shop is (Chi, 2026-10-13). */
    station: { orbit: string };
    /** The shop's own currency: how it is earned, and the supply that may one day be bought. */
    energy: {
      wallet: string;
      open: string;
      balance: string;
      fromLearning: string;
      fromSupply: string;
      howTitle: string;
      ruleSave: string;
      ruleReview: string;
      /** Hangyumi's own line: what it has paid, and how (+3 to +12 a letter, at most 333 a day). */
      fromGame: string;
      ruleGame: string;
      packsTitle: string;
      rate: string;
      story: string;
      soon: string;
      future: string;
      separate: string;
      rewardSave: string;
      rewardReview: string;
      rewardPaid: string;
      rewardMixed: string;
      previewReward: string;
    };
    loading: string;
    toCosmic: string;
    toStandard: string;
    language: string;
    freeTryOn: string;
    preview: string;
    selectPrompt: string;
    boutique: {
      openStory: string; closeStory: string;
      title: string; intro: string; map: string; curator: string; welcome: string; overview: string;
      trying: string; wearing: string; removed: string; saving: string; pieces: string; all: string;
      stories: { original: string; station33: string; collection03: string };
    };
    browse: {
      all: string; shopView: string; wardrobe: string; filters: string; country: string; collection: string; ownedOnly: string;
      clear: string; saving: string; autoSave: string; notWorn: string;
      /** Collection 04's shelf; {count} in seeAll is a number of pieces. clearNew leaves the new arrivals. */
      newArrivals: string; newArrivalsNote: string; seeAll: string; clearNew: string;
      /** The filter sheet. {count} is a number of pieces; {filter} a choice's label. */
      refine: {
        sort: string; sorts: { recommended: string; priceLow: string; priceHigh: string; newest: string };
        price: string;
        ownership: string; ownerships: { unowned: string; owned: string; affordable: string };
        colour: string; colourNote: string;
        colours: { gold: string; red: string; violet: string; green: string; blue: string; neutral: string };
        origin: string;
        showOne: string; showOther: string; none: string; reset: string; remove: string;
      };
      departments: { eyes: string; eyewear: string; earrings: string; brow: string; necklace: string; head: string; neck: string; pin: string; mouth: string; charm: string; material: string };
    };
    categories: { featured: string; jewelry: string; eyes: string; materials: string; wear: string; small: string; owned: string };
    countries: { all: string; basic: string; tw: string; us: string; fr: string; it: string; es: string };
  };

  /**
   * Hangyumi, Hangman with Yumi (lib/hangyumi). {level}: B1–C2. {count}: a
   * number. {letter} and {word}: cookies a letter and for the word.
   * {earned} and {cap}: today's cookies and the daily 333. {language}: a
   * learning language's name in the interface language. {char}: one letter.
   */
  hangyumi: {
    title: string;
    open: string;
    back: string;
    /** The game's own learning-language key: {language} is the language's name. */
    language: string;
    languageTitle: string;
    languageNote: string;
    level: string;
    levelChoice: string;
    levelRewards: string;
    nextLevel: string;
    clue: string;
    partsOfSpeech: { noun: string; verb: string; adj: string; adv: string; idiom: string };
    word: string;
    hidden: string;
    lettersLabel: string;
    charactersLabel: string;
    guessKey: string;
    usedKey: string;
    missesLeftOne: string;
    missesLeftOther: string;
    pieces: { eye: string; arm: string; body: string };
    nextPiece: string;
    studio: string;
    studioWon: string;
    studioLost: string;
    today: string;
    todayLabel: string;
    roundEarned: string;
    letterPaid: string;
    wordPaid: string;
    alreadyPaid: string;
    capped: string;
    capReached: string;
    won: string;
    wonBody: string;
    lost: string;
    lostBodyOne: string;
    lostBodyOther: string;
    lostBodyNone: string;
    answer: string;
    listen: string;
    /** Saving the round's word into the reader's vocabulary. */
    saveWord: string;
    savingWord: string;
    savedWord: string;
    alreadySaved: string;
    saveFailed: string;
    next: string;
    loading: string;
    missing: string;
    missingNote: string;
    review: string;
    failed: string;
    retry: string;
    offline: string;
    closed: string;
    rulesTitle: string;
    rules: { letters: string; misses: string; cap: string; learning: string; accents: string };
    close: string;
    reviewPage: {
      title: string;
      intro: string;
      onlyReviewers: string;
      counts: string;
      missingCell: string;
      complete: string;
      approve: string;
      reject: string;
      undo: string;
      approveAll: string;
      statuses: { draft: string; approved: string; rejected: string };
      source: string;
      clues: string;
      saving: string;
      failed: string;
      play: string;
    };
  };

  /**
   * Yumi's bilingual hello (lib/hello): the public invitation page, its
   * card, the sharer's editor and their list of invitations.
   * {name}: the sender's nickname or Exchange ID. {language}: a language's
   * name in the reader's interface language. {date}: a formatted date.
   */
  hello: {
    pageTitle: string;
    greeting: string;
    gift: string;
    yumiAlt: string;
    dragHint: string;
    privacyNote: string;
    /** On the share screen, for a hello made on a test build: why its link may not open yet. */
    testLink: string;
    /** On the hello page itself, when it is a test build serving it. */
    testPage: string;
    languageA: string;
    languageB: string;
    swap: string;
    restore: string;
    play: string;
    playFailed: string;
    /** Under the speakers on an iPhone or iPad, once one has been tapped: the silent switch mutes speech. */
    silentHint: string;
    missing: string;
    retry: string;
    retrying: string;
    voiceMenu: string;
    voiceFor: string;
    createYours: string;
    meet: string;
    signInToAdd: string;
    addFriend: string;
    adding: string;
    requestSent: string;
    requestIncoming: string;
    respond: string;
    alreadyFriends: string;
    openChat: string;
    own: string;
    openApp: string;
    friendFailed: string;
    tryAgain: string;
    loading: string;
    revokedTitle: string;
    revokedBody: string;
    missingTitle: string;
    missingBody: string;
    editorTitle: string;
    editorIntro: string;
    stepWord: string;
    sourceSaved: string;
    sourceLookup: string;
    searchSaved: string;
    noSaved: string;
    lookupPlaceholder: string;
    lookupButton: string;
    lookingUp: string;
    lookupFailed: string;
    notSaved: string;
    stepLanguages: string;
    pickBoth: string;
    stepPreview: string;
    publicFields: string;
    create: string;
    creating: string;
    createFailed: string;
    created: string;
    shareLink: string;
    shareImage: string;
    downloadImage: string;
    copyLink: string;
    copied: string;
    copyFailed: string;
    imagePreparing: string;
    imageFailed: string;
    retryImage: string;
    done: string;
    manageTitle: string;
    manageEmpty: string;
    newHello: string;
    revoke: string;
    revokeConfirm: string;
    revoked: string;
    revokeNote: string;
    createdOn: string;
    sendWithYumi: string;
    recentHello: string;
    /** Opens one of my hellos from the list. */
    openHello: string;
    /** Under "My Yumi invitations" in Settings. */
    settingsDescription: string;
    /** Making a hello refused for today's limit. */
    createLimit: string;
    /** Beside the sharer's account QR code on their hello. */
    accountQr: string;
    /** Above Create, for a reader with no nickname a hello would show: {id} is their @ID. */
    nicknamePrompt: string;
    nicknamePlaceholder: string;
    nicknameSave: string;
    nicknameSaving: string;
    nicknameInvalid: string;
    nicknameFailed: string;
    /** The chosen word has nothing a hello may carry (lib/hello/text.ts). */
    wordNotAllowed: string;
    /** A visitor's ask for a missing language failed this time. */
    fillFailed: string;
    /** ...and its tries are spent. */
    fillExhausted: string;
    /** After a hello is made: start the next one. */
    sendAnother: string;
    scanCaption: string;
    fillOnCreate: string;
    chooseWord: string;
    previewBadge: string;
    imageAlt: string;
    /** Sent with the link: who it is from and the word itself. */
    shareText: string;
  };
};
