import Image from "next/image";

export function PkmMark() {
  return (
    <Image
      src="/brand/pkm-logo.png"
      alt="Pambayang Kolehiyo ng Mauban logo"
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-full object-contain"
      priority
    />
  );
}

export function MaubanMark() {
  return (
    <Image
      src="/brand/mauban-logo.png"
      alt="Municipality of Mauban logo"
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-full object-contain"
      priority
    />
  );
}

export function BrandMarks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <PkmMark />
      <MaubanMark />
    </div>
  );
}
