import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
      <AlertCircle className="w-10 h-10 text-destructive/70" />
      <p className="text-sm text-center">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  )
}
