declare module "pinyin-to-zhuyin" {
  export type P2zOptions = {
    tonemarks?: boolean;
    inputHasToneMarks?: boolean;
    convertPunctuation?: boolean;
  };

  export type Z2pOptions = {
    tonemarks?: boolean;
    erhua?: boolean;
  };

  export function p2z(input: string, options?: P2zOptions): string;
  export function z2p(input: string, options?: Z2pOptions): string;
}
