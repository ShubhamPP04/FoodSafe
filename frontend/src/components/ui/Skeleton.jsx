/* high-end-visual-design · component: skeleton · SafeThali */

export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-paper-3 rounded-xl animate-pulse ${className}`}
      aria-hidden
    />
  )
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-3.5 bg-paper-3 rounded-full animate-pulse',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-12 w-full rounded-full" />
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
