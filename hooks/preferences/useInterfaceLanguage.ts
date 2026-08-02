"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  getInterfaceLanguage,
  subscribeToInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

export default function useInterfaceLanguage() {
  const [language, setLanguage] =
    useState<InterfaceLanguage>(
      DEFAULT_INTERFACE_LANGUAGE,
    );

  useEffect(() => {
    setLanguage(getInterfaceLanguage());

    return subscribeToInterfaceLanguage(
      (nextLanguage) => {
        setLanguage(nextLanguage);
      },
    );
  }, []);

  return language;
}
