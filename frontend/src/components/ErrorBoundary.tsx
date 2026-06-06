import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
          <div className="card-bold bg-white p-6 max-w-sm w-full space-y-4">
            <h1 className="font-display text-3xl text-ink">
              うまく表示できませんでした。
            </h1>
            <p className="text-sm text-muted">
              再読み込みすると直るかもしれません。
            </p>
            <button
              onClick={this.handleReload}
              className="w-full h-11 bg-ink text-white font-bold rounded-lg border-2 border-ink"
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
