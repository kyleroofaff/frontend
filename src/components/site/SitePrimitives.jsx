import { useRef } from "react";
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

function sanitizeFilename(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadQrPng(svgElement, fileBaseName) {
  if (typeof window === "undefined" || !svgElement) return;
  const serialized = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = window.URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    const imageLoaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = svgUrl;
    await imageLoaded;

    const canvas = document.createElement("canvas");
    const width = Number(svgElement.getAttribute("width")) || 256;
    const height = Number(svgElement.getAttribute("height")) || 256;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = `${sanitizeFilename(fileBaseName) || "qr-code"}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.URL.revokeObjectURL(svgUrl);
  }
}

export function SellerQrCard({ seller, compact = false }) {
  const profileUrl = createSellerProfileUrl(seller.id);
  const qrContainerRef = useRef(null);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Share profile QR code</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">Buyers can scan this code to open {seller.name}&rsquo;s profile page directly.</p>
        </div>
        <div ref={qrContainerRef} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-rose-100">
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
        <button
          onClick={() => {
            const svgNode = qrContainerRef.current?.querySelector("svg");
            downloadQrPng(svgNode, `${seller.name || seller.id}-profile-qr`);
          }}
          className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          Download QR
        </button>
      </div>
    </div>
  );
}

export function BarQrCard({ bar, compact = false, t = {} }) {
  const profileUrl = createBarProfileUrl(bar.id);
  const qrContainerRef = useRef(null);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">{t.shareBarQr || 'Share bar page QR code'}</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{typeof t.shareBarQrHelp === 'function' ? t.shareBarQrHelp(bar.name) : `Visitors can scan this code to open ${bar.name}\u2019s bar profile directly.`}</p>
        </div>
        <div ref={qrContainerRef} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-rose-100">
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
          {t.copyLink || 'Copy Link'}
        </button>
        <button
          onClick={() => {
            const svgNode = qrContainerRef.current?.querySelector("svg");
            downloadQrPng(svgNode, `${bar.name || bar.id}-bar-qr`);
          }}
          className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {t.downloadQr || 'Download QR'}
        </button>
      </div>
    </div>
  );
}
