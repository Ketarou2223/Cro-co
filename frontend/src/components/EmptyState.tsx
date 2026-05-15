import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { type VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  buttonVariant?: VariantProps<typeof buttonVariants>['variant']
}

export default function EmptyState({ icon, title, description, actionLabel, onAction, buttonVariant = 'default' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button variant={buttonVariant} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
