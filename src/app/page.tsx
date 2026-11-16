import { LedgerApp } from "@/ledger/views/LedgerApp";

export default function Home() {
  return (
    <>
      <LedgerApp />
      <footer className="bg-brand-dark text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-4 text-sm">
          <p className="font-bold">ayrus AI</p>
          <p className="opacity-80">Hisaab is built by ayrus AI.</p>
        </div>
      </footer>
    </>
  );
}
