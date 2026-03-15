import { QRCodeSVG } from "qrcode.react";

export function ProductImage({ src, label = "Product image" }) {
  if (src) {
    return <img src={src} alt={label} className="h-full min-h-[160px] w-full rounded-2xl object-cover ring-1 ring-rose-100" />;
  }
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-100 text-sm text-slate-500 ring-1 ring-rose-100">
      {label}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8">
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-2xl text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

export function PageShell({ eyebrow, title, subtitle, children }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function createSellerProfileUrl(sellerId) {
  if (typeof window === "undefined") return `/seller/${sellerId}`;
  return `${window.location.origin}/seller/${sellerId}`;
}

function createBarProfileUrl(barId) {
  if (typeof window === "undefined") return `/bar/${barId}`;
  return `${window.location.origin}/bar/${barId}`;
}

export function SellerQrCard({ seller, compact = false }) {
  const profileUrl = createSellerProfileUrl(seller.id);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Share profile QR code</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">Buyers can scan this code to open {seller.name}&rsquo;s profile page directly.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-rose-100">
          <QRCodeSVG value={profileUrl} size={compact ? 112 : 132} includeMargin />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input readOnly value={profileUrl} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" />
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.navigator?.clipboard) {
              window.navigator.clipboard.writeText(profileUrl);
            }
          }}
          className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}

export function BarQrCard({ bar, compact = false }) {
  const profileUrl = createBarProfileUrl(bar.id);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Share bar page QR code</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">Visitors can scan this code to open {bar.name}&rsquo;s bar profile directly.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-rose-100">
          <QRCodeSVG value={profileUrl} size={compact ? 112 : 132} includeMargin />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input readOnly value={profileUrl} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" />
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.navigator?.clipboard) {
              window.navigator.clipboard.writeText(profileUrl);
            }
          }}
          className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}
