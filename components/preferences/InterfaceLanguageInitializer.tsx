const languageScript = `
(function () {
  try {
    var saved =
      localStorage.getItem(
        "exchange-notes-interface-language"
      ) || "english";

    var language =
      saved === "traditional-chinese"
        ? "traditional-chinese"
        : "english";

    var root = document.documentElement;

    root.dataset.interfaceLanguage = language;
    root.lang =
      language === "traditional-chinese"
        ? "zh-Hant"
        : "en";
  } catch (error) {
    document.documentElement.dataset.interfaceLanguage =
      "english";
    document.documentElement.lang = "en";
  }
})();
`;

export default function InterfaceLanguageInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: languageScript,
      }}
    />
  );
}
