/**
 * The HISAAB lockup: a gold-ruled monogram beside the name in tracked capitals.
 * Used in the header, the loading and error screens, and the statement.
 */
export function Wordmark({
  tone = "onBrand",
  size = "md",
  subtitle,
}: {
  tone?: "onBrand" | "onLight";
  size?: "sm" | "md";
  subtitle?: string;
}) {
  const onBrand = tone === "onBrand";
  const tile = onBrand ? "border-gold/50 bg-white/10 text-gold" : "border-gold/60 bg-gold-soft text-gold";
  const name = onBrand ? "text-white" : "text-brand";
  const sub = onBrand ? "text-white/60" : "text-muted";
  const tileSize = size === "sm" ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl";
  const nameSize = size === "sm" ? "text-lg" : "text-[22px]";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className={`wordmark flex shrink-0 items-center justify-center rounded-xl border ${tile} ${tileSize}`}>
        H
      </span>
      <span className="min-w-0">
        <span className={`wordmark block leading-none ${name} ${nameSize}`}>HISAAB</span>
        {subtitle && <span className={`mt-1.5 block truncate text-[13px] font-medium ${sub}`}>{subtitle}</span>}
      </span>
    </div>
  );
}
