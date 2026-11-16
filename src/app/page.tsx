import { LedgerApp } from "@/ledger/views/LedgerApp";

export default function Home() {
  return (
    <>
      <LedgerApp />
      <footer className="bg-brand-deep text-white">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-extrabold tracking-[0.18em] text-gold">ayrus AI</p>
            <p className="mt-1 text-sm text-white/60">HISAAB is built by ayrus AI.</p>
          </div>
          <p className="text-right text-xs text-white/40">Works offline · Your data stays on this device</p>
        </div>
      </footer>
    </>
  );
}
