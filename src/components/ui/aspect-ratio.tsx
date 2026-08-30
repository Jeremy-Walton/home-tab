import { cn } from '@/lib/utils'

function AspectRatio({
  ratio,
  style,
  className,
  ...props
}: React.ComponentProps<'div'> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          ...style,
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  )
}

export { AspectRatio }
