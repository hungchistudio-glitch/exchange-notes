import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PocketLookup from "@/components/pocket/PocketLookup";
import { setInterfaceLanguage } from "@/lib/appPreferences";
const test=vi.hoisted(()=>({submit:vi.fn(),reset:vi.fn(),cancel:vi.fn(),audio:null as null|((blob:Blob)=>Promise<unknown>),transcribe:vi.fn()}));
vi.mock("@/contexts/VocabularyContext",()=>({useVocabulary:()=>({items:[],addItem:vi.fn()})}));
vi.mock("@/contexts/LearningLanguageContext",()=>({LocalLearningLanguageProvider:({children}:{children:React.ReactNode})=>children,useLearningLanguageContext:()=>({languagePair:["en","zh-TW"]})}));
vi.mock("@/hooks/lexicon/useLexiconSearch",()=>({default:()=>({query:"",setQuery:vi.fn(),submit:test.submit,reset:test.reset,result:null,status:"idle",error:null})}));
vi.mock("@/hooks/lexicon/useLexiconSave",()=>({default:()=>({stateFor:()=>"idle",save:vi.fn()})}));
vi.mock("@/hooks/useCosmicMode",()=>({default:()=>false}));
vi.mock("@/hooks/useVoiceInput",()=>({default:(options:{onAudio:(audio:Blob)=>Promise<unknown>})=>{test.audio=options.onAudio;return {cancel:test.cancel,supported:false,phase:"idle"};}}));
vi.mock("@/lib/lexicon/voiceLookup",()=>({transcribeSpeech:test.transcribe,warmVoiceLookup:vi.fn()}));
vi.mock("@/components/voice/VoiceSea",()=>({default:()=>null}));
beforeEach(()=>{vi.clearAllMocks();setInterfaceLanguage("english");});
it("keeps draft text through a local language switch and invalidates the departed search",()=>{
 render(<PocketLookup/>);
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"merci"}});
 fireEvent.change(screen.getByRole("combobox",{name:"Learning language"}),{target:{value:"fr"}});
 expect(screen.getByRole("textbox")).toHaveValue("merci");expect(test.reset).toHaveBeenCalled();
 fireEvent.submit(screen.getByRole("textbox").closest("form")!);
 expect(test.submit).toHaveBeenCalledWith("merci");
});
it("does not submit a transcription that arrives after the user leaves",async()=>{
 let resolve!:(value:{outcome:string;text:string})=>void;
 test.transcribe.mockReturnValue(new Promise(r=>{resolve=r;}));
 const {unmount}=render(<PocketLookup/>);
 const pending=test.audio!(new Blob(["voice"]));unmount();
 await act(async()=>{resolve({outcome:"handled",text:"stale word"});await pending;});
 expect(test.cancel).toHaveBeenCalled();expect(test.submit).not.toHaveBeenCalled();
});
it("typing cancels a pending voice result instead of overwriting the new text",async()=>{
 let resolve!:(value:{outcome:string;text:string})=>void;
 test.transcribe.mockReturnValue(new Promise(r=>{resolve=r;}));
 render(<PocketLookup/>);const pending=test.audio!(new Blob(["voice"]));
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"new word"}});
 await act(async()=>{resolve({outcome:"handled",text:"old word"});await pending;});
 expect(screen.getByRole("textbox")).toHaveValue("new word");expect(test.submit).not.toHaveBeenCalled();
});
