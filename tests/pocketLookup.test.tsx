import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PocketLookupView, { type PocketViewProps } from "@/components/pocket/PocketLookupView";
import PocketPreferencesSync from "@/components/pocket/PocketPreferencesSync";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import { speak } from "@/lib/speech";
import { POST } from "@/app/api/pocket-lookup-review/route";
import { reviewRouteOnly } from "@/lib/reviewRoutes";
import type { LanguageCode } from "@/lib/languages";

vi.mock("@/lib/speech",()=>({speak:vi.fn()}));
vi.mock("@/lib/reviewRoutes",()=>({reviewRouteOnly:vi.fn()}));
vi.mock("@/hooks/useCosmicMode",()=>({default:()=>true}));
vi.mock("@/hooks/useDisplayLanguages",()=>({default:()=>({pair:["fr","zh-TW"]})}));
const props=():PocketViewProps=>({cosmic:false,query:"apple",onQuery:vi.fn(),onSubmit:vi.fn(),pair:["en","zh-TW"],onPair:vi.fn(),entry:null,busy:false,failed:false,saved:false,saving:false,onVoice:vi.fn(),onSave:vi.fn()});
beforeEach(()=>{setInterfaceLanguage("english");vi.clearAllMocks();});
describe("Pocket lookup controls",()=>{
 it("keeps the pair distinct and supports switching either side",()=>{
  const p=props();render(<PocketLookupView {...p}/>);
  fireEvent.change(screen.getByRole("combobox",{name:"Learning language"}),{target:{value:"zh-TW"}});
  expect(p.onPair).toHaveBeenLastCalledWith("zh-TW","en");
  fireEvent.change(screen.getByRole("combobox",{name:"Translation language"}),{target:{value:"fr"}});
  expect(p.onPair).toHaveBeenLastCalledWith("en","fr");
 });
 it("submits explicitly, speaks the returned languages and prevents a duplicate save",()=>{
  const p=props();p.entry={term:"merci",translation:"謝謝",termLanguage:"fr",translationLanguage:"zh-TW",partOfSpeech:"interjection",termExample:"",translationExample:"",confidence:"high",category:"other"};
  p.saved=true;render(<PocketLookupView {...p}/>);
  fireEvent.submit(screen.getByRole("textbox").closest("form")!);expect(p.onSubmit).toHaveBeenCalledOnce();
  const speakers=screen.getAllByRole("button",{name:/^Play pronunciation:/});
  expect(speakers).toHaveLength(2);fireEvent.click(speakers[0]);fireEvent.click(speakers[1]);
  expect(speak).toHaveBeenNthCalledWith(1,"merci","fr-FR");expect(speak).toHaveBeenNthCalledWith(2,"謝謝","zh-TW");
  expect(screen.getByRole("button",{name:/Saved/})).toBeDisabled();
 });
 it("does not render an old card while another lookup is pending",()=>{
  const p=props();p.busy=true;render(<PocketLookupView {...p}/>);
  expect(screen.getByRole("status")).toBeTruthy();expect(screen.queryByRole("article")).toBeNull();
 });
});
describe("Preference bridge",()=>{
 it("sends only presentation settings and removes listeners on unmount",()=>{
  const postMessage=vi.fn();Object.defineProperty(window,"webkit",{configurable:true,value:{messageHandlers:{yumiPocketPreferences:{postMessage}}}});
  const {unmount}=render(<PocketPreferencesSync/>);
  expect(postMessage).toHaveBeenCalledWith({version:1,appMode:"cosmic",interfaceLanguage:"english",learningLanguageCode:"fr",translationLanguageCode:"zh-TW"});
  window.dispatchEvent(new Event("exchange-notes-native-ready"));expect(postMessage).toHaveBeenCalledTimes(2);
  unmount();window.dispatchEvent(new Event("exchange-notes-native-ready"));expect(postMessage).toHaveBeenCalledTimes(2);
  Reflect.deleteProperty(window,"webkit");
 });
});
describe("Review API uses real dictionary without authentication or AI",()=>{
 const words:Record<LanguageCode,string>={en:"thank you","zh-TW":"謝謝",es:"gracias",fr:"merci",it:"grazie"};
 for(const [source,query] of Object.entries(words)) for(const [target,translation] of Object.entries(words)) if(source!==target){
  it(`${source} → ${target}`,async()=>{
   const response=await POST(new Request("http://localhost/api/pocket-lookup-review",{method:"POST",body:JSON.stringify({query,source,target})}));
   expect(response.status).toBe(200);expect((await response.json()).entry.translation).toBe(translation);expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
 }
 it.each([{query:"x",source:"en",target:"en"},{query:"x",source:"ja",target:"fr"},{query:"x".repeat(201),source:"en",target:"fr"},null])("rejects invalid input %j",async body=>{
  const response=await POST(new Request("http://localhost/api/pocket-lookup-review",{method:"POST",body:JSON.stringify(body)}));expect(response.status).toBe(400);
 });
 it("cannot bypass the production guard",async()=>{
  vi.mocked(reviewRouteOnly).mockImplementationOnce(()=>{throw new Error("NOT_FOUND");});
  await expect(POST(new Request("http://localhost"))).rejects.toThrow("NOT_FOUND");
 });
});
