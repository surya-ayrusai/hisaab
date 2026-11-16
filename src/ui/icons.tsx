/** Small inline icons. Kept local so the app loads no icon library and no remote asset. */

type IconProps = { className?: string };

const base = "h-5 w-5 shrink-0";

export function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="12" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="17" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.17-1.35a9.93 9.93 0 0 0 4.87 1.25h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.88 9.88 0 0 0 12.04 2Zm0 1.84c2.17 0 4.2.84 5.74 2.38a8.07 8.07 0 0 1 2.38 5.74c0 4.48-3.64 8.12-8.12 8.12a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.07.8.82-2.99-.19-.31a8.08 8.08 0 0 1-1.24-4.31c0-4.48 3.64-8.12 8.11-8.12Zm-2.3 4.1c-.17 0-.45.07-.69.32-.24.25-.9.88-.9 2.15 0 1.27.92 2.49 1.05 2.66.13.17 1.8 2.86 4.46 3.9 2.21.87 2.66.7 3.14.65.48-.04 1.55-.63 1.77-1.25.22-.62.22-1.14.15-1.25-.06-.11-.24-.18-.5-.31-.26-.13-1.55-.77-1.79-.85-.24-.09-.41-.13-.59.13-.17.25-.67.85-.82 1.02-.15.18-.3.2-.56.07-.26-.13-1.1-.41-2.1-1.3-.78-.69-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.42-.8-1.94-.21-.51-.42-.44-.58-.45h-.5Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PrintIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path d="M7 9V4h10v5M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-4A1.5 1.5 0 0 1 5.5 11h13a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="15" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A coloured disc with the customer's initial, so rows are easy to scan. */
export function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  const tones = [
    "bg-brand-soft text-brand",
    "bg-gold-soft text-gold",
    "bg-paid-soft text-paid",
    "bg-due-soft text-due",
  ];
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${tones[sum % tones.length]}`}
    >
      {letter}
    </span>
  );
}
