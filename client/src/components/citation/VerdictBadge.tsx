import { cn, verdictColor, verdictDot } from '@/lib/utils'

interface Props {
  verdict: string
  size?: 'sm' | 'md'
}

export function VerdictBadge({ verdict, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        verdictColor(verdict),
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', verdictDot(verdict))} />
      {verdict}
    </span>
  )
}
