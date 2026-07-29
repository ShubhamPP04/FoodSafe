/* Hallmark · component: skeleton · genre: modern-minimal · theme: SafeThali */

/** Single rectangular skeleton block */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-paper-3 rounded-lg animate-pulse ${className}`}
      aria-hidden
    />
  )
}

/** Multi-line text skeleton. Last line is 75% width. */
export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-3.5 bg-paper-3 rounded animate-pulse',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

/** Scan / result loading placeholder */
export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-11 w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-14 rounded-xl" />
        <SkeletonBlock className="h-14 rounded-xl" />
      </div>
    </div>
  )
}
