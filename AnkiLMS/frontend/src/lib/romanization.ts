import { convert } from "hangul-romanization";

/** Revised Romanization of Korean (국어의 로마자 표기법). */
export function romanizeKorean(value: string): string {
  return convert(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}
