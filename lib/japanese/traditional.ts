/* =========================================================
   Japanese kanji in Traditional Chinese forms (2026-11-16)

   Japan simplified a few hundred characters in 1946 (新字体): 経験 is
   經驗 in Taiwan, 図書館 圖書館, 学生 學生. A reader who knows
   Traditional Chinese recognises the word at once when it is shown in the
   forms they know, so a Japanese card shows them when they differ (Chi:
   漢字橋樑).

   Only one-to-one pairs are listed. Characters Japan merged from several
   (予 for 預 and 豫, 弁 for 辯, 辨 and 瓣, 余 and 餘, 欠 and 缺, 台 and
   臺) are left as they are: picking one would sometimes be wrong, and a
   wrong character is worse than none. Forms are Taiwan's standard ones
   (為, 衛, 黃, 錄), not the older Japanese 旧字体 (爲, 衞).
   ========================================================= */

const PAIRS =
  "亜亞悪惡圧壓囲圍医醫壱壹隠隱栄榮営營駅驛円圓塩鹽縁緣艶豔応應欧歐殴毆桜櫻奥奧横橫温溫穏穩" +
  "仮假価價画畫会會壊壞懐懷絵繪拡擴殻殼覚覺学學楽樂渇渴缶罐巻卷陥陷勧勸寛寬関關歓歡観觀" +
  "気氣帰歸亀龜戯戲犠犧旧舊拠據挙舉峡峽挟挾狭狹暁曉区區駆驅勲勳薫薰径徑茎莖恵惠掲揭渓溪" +
  "経經蛍螢軽輕継繼鶏雞芸藝撃擊剣劍県縣倹儉険險圏圈検檢献獻権權顕顯験驗厳嚴広廣効效恒恆" +
  "黄黃鉱礦号號国國黒黑砕碎済濟斎齋剤劑雑雜参參桟棧蚕蠶惨慘賛贊残殘糸絲歯齒児兒辞辭湿濕" +
  "実實写寫釈釋寿壽収收従從渋澀獣獸縦縱粛肅処處叙敘将將称稱渉涉焼燒証證奨獎条條状狀乗乘" +
  "浄淨剰剩畳疊縄繩壌壤嬢孃譲讓醸釀触觸嘱囑寝寢尽盡図圖粋粹酔醉穂穗随隨髄髓枢樞数數瀬瀨" +
  "声聲斉齊静靜窃竊摂攝専專浅淺戦戰践踐銭錢潜潛繊纖禅禪双雙壮壯争爭荘莊捜搜挿插巣巢装裝" +
  "総總騒騷増增蔵藏臓臟属屬続續堕墮対對体體帯帶滞滯滝瀧択擇沢澤担擔単單胆膽団團断斷弾彈" +
  "遅遲痴癡虫蟲昼晝鋳鑄庁廳徴徵聴聽逓遞鉄鐵転轉点點伝傳灯燈当當党黨盗盜稲稻闘鬥徳德独獨" +
  "読讀届屆弐貳悩惱脳腦覇霸拝拜廃廢売賣麦麥発發髪髮抜拔蛮蠻浜濱払拂仏佛辺邊変變歩步宝寶" +
  "豊豐毎每万萬満滿黙默弥彌訳譯薬藥誉譽揺搖様樣謡謠来來頼賴乱亂覧覽竜龍両兩猟獵緑綠涙淚" +
  "塁壘礼禮励勵戻戾霊靈齢齡暦曆歴歷恋戀炉爐労勞楼樓禄祿録錄湾灣説說税稅鋭銳脱脫閲閱悦悅" +
  "姫姬郷鄉内內呉吳娯娛値值舎舍遥遙歳歲曽曾錬鍊隣鄰団團駐駐郵郵剣劍鎮鎮翻翻巣巢査查";

let table: Map<string, string> | null = null;

function pairs(): Map<string, string> {
  if (table) return table;
  table = new Map();
  const chars = [...PAIRS];
  for (let index = 0; index + 1 < chars.length; index += 2) {
    if (chars[index] !== chars[index + 1]) table.set(chars[index], chars[index + 1]);
  }
  return table;
}

/** `text` with each simplified kanji in its Traditional form. */
export function toTraditionalForms(text: string): string {
  const known = pairs();
  return [...text].map((char) => known.get(char) ?? char).join("");
}

/**
 * The Traditional Chinese forms of a Japanese word, or null when they are
 * the forms it is already written in (本, 日本, 先生): a card shows the
 * line only when it teaches something.
 */
export function japaneseInTraditional(text: string): string | null {
  const written = text.trim();
  if (!/\p{Script=Han}/u.test(written)) return null;
  const traditional = toTraditionalForms(written);
  return traditional === written ? null : traditional;
}
