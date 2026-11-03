"use client";

interface PolicyAcceptanceProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

export function PolicyAcceptance({ checked, onChange, required = true }: PolicyAcceptanceProps) {
  return (
    <label className="flex items-start gap-2.5 text-xs leading-5 text-slate-300">
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-blue-500"
      />
      <span>
        Tôi đồng ý với <a className="font-bold text-blue-400 underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">Điều khoản sử dụng</a>, <a className="font-bold text-blue-400 underline underline-offset-2" href="/privacy" target="_blank" rel="noreferrer">Chính sách quyền riêng tư</a> và <a className="font-bold text-blue-400 underline underline-offset-2" href="/community-rules" target="_blank" rel="noreferrer">Quy tắc cộng đồng</a>.
      </span>
    </label>
  );
}
