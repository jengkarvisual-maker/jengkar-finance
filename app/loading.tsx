export default function Loading() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f1e7] px-6 py-10 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(134,106,51,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(54,102,72,0.12),transparent_26%)]" />
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="finance-splash-pulse rounded-[36px] border border-border/70 bg-white/88 p-4 soft-shadow backdrop-blur">
          <img
            alt="RUMAH JENGKAR FINANCE"
            className="h-28 w-28 rounded-[28px] object-cover"
            height={112}
            src="/icons/icon-512.png"
            width={112}
          />
        </div>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          Rumah Jengkar
        </p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.08em] text-foreground">
          Finance
        </h1>
        <div className="mt-5 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-foreground/90 [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-foreground/70 [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-foreground/55" />
        </div>
      </div>
    </main>
  );
}
