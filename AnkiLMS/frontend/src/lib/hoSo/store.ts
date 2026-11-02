// Dữ liệu nháp chỉ nằm trong localStorage của trình duyệt này, không gửi đi đâu.
import { useSyncExternalStore } from "react";
import type { XacNhanData } from "./fill";

const KEY = "haechivn_ho_so_xac_nhan";
const EVT = "haechivn_ho_so_changed";

const today = () => { const d = new Date(); return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, "0"), day: String(d.getDate()).padStart(2, "0") }; };
export const emptyXacNhan = (): XacNhanData => ({
  name: "", arc: "", major: "", term: "", phone: "", email: "", company: "", bizNo: "", industry: "", address: "",
  employer: "", employerPhone: "", periodFrom: "", periodTo: "", wage: "", mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "", ...today(), office: "", addrKr: "", job: "", startTime: "", endTime: "", breakMin: "",
});

let cacheRaw: string | null | undefined;
let cacheVal: XacNhanData | null = null;
const snapshot = () => {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* bị chặn thì coi như trống */ }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try { cacheVal = raw ? { ...emptyXacNhan(), ...JSON.parse(raw) } : null; } catch { cacheVal = null; }
  }
  return cacheVal;
};
const subscribe = (cb: () => void) => { window.addEventListener(EVT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); }; };

export const useXacNhanData = () => useSyncExternalStore(subscribe, snapshot, () => null);
export function saveXacNhan(d: XacNhanData) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)); }
export function clearXacNhan() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)); }
