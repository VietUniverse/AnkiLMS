interface BrandLoadingMascotProps {
  label?: string;
  className?: string;
}

export function BrandLoadingMascot({ label = "Đang tải…", className = "" }: BrandLoadingMascotProps) {
  return (
    <div role="status" aria-label={label} aria-live="polite" className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex h-14 w-20 items-end justify-center overflow-hidden">
        <img
          src="/brand/haechivn-mark.webp"
          alt=""
          aria-hidden="true"
          className="h-12 w-12 animate-haechi-run object-contain"
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
