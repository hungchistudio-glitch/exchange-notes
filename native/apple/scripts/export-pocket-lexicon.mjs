import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const source = readFileSync(path.join(root,"lib/vocabulary/coreLexiconData.ts"),"utf8");
const match = source.match(/export const CORE_LEXICON_SOURCE = `([\s\S]*?)`;/);
if (!match) throw new Error("Core lexicon source not found");
const codes=["en","zh-TW","es","fr","it"];
const rows=match[1].trim().split("\n").map(line=>{
  const parts=line.split("|");
  if(parts.length!==7||parts.some(x=>!x.trim()))throw new Error("Invalid lexicon row");
  return Object.fromEntries(codes.map((code,i)=>[code,parts[i+2].split(";")]));
});
const target=path.join(root,"native/apple/ExchangeNotesApple/Share/Resources");
mkdirSync(target,{recursive:true});
writeFileSync(path.join(target,"pocket-lexicon.json"),JSON.stringify(rows));
console.log(`Exported ${rows.length} entries from the existing lexicon.`);
