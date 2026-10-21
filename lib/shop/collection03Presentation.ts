import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { ShopItem } from "./catalog";
import { isCollection03 } from "./collection03";

export type ShopCollection = "all" | "collection03" | "earth03" | "dark03" | "finish03";
export const SHOP_COLLECTIONS: ShopCollection[] = ["all", "collection03", "earth03", "dark03", "finish03"];
export function inShopCollection(item: ShopItem, collection: ShopCollection) {
  if (collection === "all") return true;
  if (!isCollection03(item.id)) return false;
  return collection === "collection03" || (collection === "earth03" ? item.country !== "basic" : collection === "finish03" ? item.slot === "material" : item.country === "basic" && item.slot !== "material");
}
type Copy = { labels: Record<ShopCollection,string>; preview: string; newItem: string };
export const COLLECTION03_COPY: Record<InterfaceLanguage, Copy> = {
  "traditional-chinese": {labels:{all:"全部系列",collection03:"第 03 系列 · 57 件",earth03:"地球紀念品",dark03:"暗黑科技",finish03:"身體材質"},preview:"第 03 系列試閱 · 新品價格為提案。試用餘額與購買只保留在此頁，不影響你的帳戶。",newItem:"新品"},
  english:{labels:{all:"All collections",collection03:"Collection 03 · 57 pieces",earth03:"Earth souvenirs",dark03:"Dark technology",finish03:"Shell finishes"},preview:"Collection 03 preview · New prices are proposals. Trial balance and purchases stay on this page and do not affect your account.",newItem:"New"},
  french:{labels:{all:"Toutes les collections",collection03:"Collection 03 · 57 pièces",earth03:"Souvenirs de la Terre",dark03:"Technologie sombre",finish03:"Matières du corps"},preview:"Aperçu de la collection 03 · Prix proposés. Le solde et les achats d’essai restent sur cette page, sans effet sur votre compte.",newItem:"Nouveau"},
  italian:{labels:{all:"Tutte le collezioni",collection03:"Collezione 03 · 57 articoli",earth03:"Ricordi della Terra",dark03:"Tecnologia oscura",finish03:"Materiali del corpo"},preview:"Anteprima della collezione 03 · Prezzi proposti. Il saldo e gli acquisti di prova restano su questa pagina e non modificano il tuo account.",newItem:"Novità"},
  spanish:{labels:{all:"Todas las colecciones",collection03:"Colección 03 · 57 artículos",earth03:"Recuerdos de la Tierra",dark03:"Tecnología oscura",finish03:"Materiales del cuerpo"},preview:"Vista previa de la colección 03 · Precios propuestos. El saldo y las compras de prueba permanecen en esta página y no afectan a tu cuenta.",newItem:"Nuevo"},
};
