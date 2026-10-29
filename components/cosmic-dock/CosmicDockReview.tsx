'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, MessageCircle, Orbit, Search, Compass, Settings2, X, ArrowUpRight } from 'lucide-react';
import s from './CosmicDockReview.module.css';
import CosmicCoreNavigation from '../foundation/layout/CosmicCoreNavigation';
const copy = {
 'zh-TW': { names:['單字庫','訊息','首頁','搜尋','探索','設定'], open:'展開控制列', close:'收起控制列', intro:'你的宇宙，隨手可及。', hint:'點擊底部星核，展開六個目的地。', demo:'互動設計試閱', search:'搜尋你的宇宙', placeholder:'輸入單字…', empty:'此處示範搜尋面板；正式查字於接入後提供。' },
 en: { names:['Vocabulary','Messages','Home','Search','Discover','Settings'], open:'Open controls', close:'Close controls', intro:'Your universe. Within reach.', hint:'Tap the core below to reveal six destinations.', demo:'Interactive design preview', search:'Search your universe', placeholder:'Enter a word…', empty:'Search panel preview. Live lookup follows integration.' },
 es: { names:['Vocabulario','Mensajes','Inicio','Buscar','Explorar','Ajustes'], open:'Abrir controles', close:'Cerrar controles', intro:'Tu universo, al alcance.', hint:'Toca el núcleo para ver seis destinos.', demo:'Vista previa interactiva', search:'Busca en tu universo', placeholder:'Escribe una palabra…', empty:'Vista previa. La búsqueda real llegará con la integración.' },
 fr: { names:['Vocabulaire','Messages','Accueil','Rechercher','Explorer','Réglages'], open:'Ouvrir les commandes', close:'Fermer les commandes', intro:'Votre univers, à portée de main.', hint:'Touchez le noyau pour découvrir six destinations.', demo:'Aperçu interactif', search:'Explorez votre univers', placeholder:'Saisissez un mot…', empty:'Aperçu du panneau. La recherche sera intégrée ensuite.' },
 it: { names:['Vocabolario','Messaggi','Home','Cerca','Esplora','Impostazioni'], open:'Apri i comandi', close:'Chiudi i comandi', intro:'Il tuo universo, a portata di mano.', hint:'Tocca il nucleo per scoprire sei destinazioni.', demo:'Anteprima interattiva', search:'Cerca nel tuo universo', placeholder:'Inserisci una parola…', empty:'Anteprima del pannello. La ricerca arriverà con l’integrazione.' },
};
const icons=[BookOpen,MessageCircle,Orbit,Search,Compass,Settings2];
export default function CosmicDockReview(){
 const [language,setLanguage]=useState<keyof typeof copy>('zh-TW');
 const [active,setActive]=useState(4),[search,setSearch]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const t=copy[language];
 useEffect(()=>{if(search)dialog.current?.showModal();else dialog.current?.close();},[search]);
 function select(index:number){if(index===3)setSearch(true);else setActive(index);}
 const Icon=icons[active];
 return <main className={s.page} lang={language}>
  <header className={s.header}><span>EXCHANGE NOTES <i>／ COSMIC</i></span><select aria-label="Interface language" value={language} onChange={e=>setLanguage(e.target.value as keyof typeof copy)}>{Object.entries({'zh-TW':'繁體中文',en:'English',es:'Español',fr:'Français',it:'Italiano'}).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></header>
  <section className={s.content}><div className={s.eyebrow}>YUMI SYSTEMS · 033</div><h1>{t.names[active]}</h1><p>{t.intro}</p><div className={s.art} aria-hidden="true"><div className={s.planet}/><div className={s.orbit}/><span className={s.coordinates}>33° / ORBITAL FIELD</span><Icon size={32} strokeWidth={1}/></div><div className={s.caption}><span>{t.demo}</span><ArrowUpRight size={18}/></div><p className={s.instruction}>{t.hint}</p></section>
  <CosmicCoreNavigation label={t.open} items={icons.map((Item,index)=>({label:t.names[index],icon:<Item size={21} strokeWidth={1.55}/>,active:index===active,onSelect:()=>select(index)}))}/>
  <dialog ref={dialog} className={s.dialog} onCancel={()=>setSearch(false)} onClose={()=>setSearch(false)}><button aria-label={t.close} onClick={()=>setSearch(false)}><X size={22}/></button><h2>{t.search}</h2><input aria-label={t.names[3]} placeholder={t.placeholder}/><p>{t.empty}</p></dialog>
 </main>;
}
