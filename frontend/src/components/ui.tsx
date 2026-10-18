import { CircleAlert, LoaderCircle } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { scoreBand, toneColor } from '../lib/format'
import { signFor, signHtml } from './signs'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-muted">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-bad-soft p-5">
      <div className="flex items-start gap-2 font-semibold text-bad">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden /> {message}
      </div>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-lg flex flex-col items-center gap-3 px-6 py-10 text-center text-muted">
      <h2 className="text-xl">{title}</h2>
      {children}
    </div>
  )
}

/** A round category sign (hostel, mess, pharmacy, metro...), the same one the map uses. */
export function SignBadge({ kind, small, className = '' }: { kind: string; small?: boolean; className?: string }) {
  const s = signFor(kind)
  return (
    <span aria-hidden className={`sign ${small ? 'sign-sm' : ''} ${className}`}
      style={{ '--sign-bg': s.bg, '--sign-fg': s.fg } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: signHtml(kind) }} />
  )
}

/** Just the glyph of a sign, inline with text. */
export function Glyph({ kind, size = 16, className = '', tinted }: { kind: string; size?: number; className?: string; tinted?: boolean }) {
  return <span aria-hidden className={`inline-flex shrink-0 ${className}`} style={tinted ? { color: signFor(kind).bg } : undefined}
    dangerouslySetInnerHTML={{ __html: signHtml(kind, size) }} />
}

export function ScoreRing({ score, size = 52 }: { score: number | null; size?: number }) {
  const stroke = Math.max(4, Math.round(size / 11))
  const r = size / 2 - stroke / 2 - 1
  const c = 2 * Math.PI * r
  const band = scoreBand(score)
  const color = toneColor[band.tone]
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" aria-label={score == null ? 'Not enough data to score' : `Best-Fit score ${score} out of 100, ${band.label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {score != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--ink)"
          style={{ font: `800 ${Math.round(size * 0.36)}px var(--font-sans)`, letterSpacing: '-0.03em' }}>{score ?? '–'}</text>
      </svg>
      <span className="text-[11.5px] font-semibold whitespace-nowrap text-muted">{band.label}</span>
    </div>
  )
}

export function Section({ title, hint, children, id, sign }: { title: string; hint?: ReactNode; children: ReactNode; id?: string; sign?: string }) {
  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-labelledby={id}>
      <div className="flex items-start gap-3">
        {sign && <SignBadge kind={sign} />}
        <div className="flex flex-col gap-1">
          <h2 id={id} className="text-xl">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

/** Renders a value or a clear "Not reported" marker. Unknown facts are never filled in. */
export function Fact({ value, unknown = 'Not reported' }: { value: ReactNode | null | undefined; unknown?: string }) {
  if (value == null || value === '') return <span className="text-faint italic">{unknown}</span>
  return <>{value}</>
}

/** A small floating confirmation ("Saved", "Added to compare"). */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="status" className="pointer-events-none fixed left-1/2 top-20 z-[950] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-on-ink shadow-lg">
      {message}
    </div>
  )
}
