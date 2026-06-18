// 解説: このファイルは React のエラーバウンダリコンポーネントを定義する。
// 解説: 呼ばれる場所: main.tsx で全アプリをラップして、レンダリング中の例外をキャッチする
// 解説: 「エラーバウンダリ」= React ツリー内で throw が発生したとき白画面（WSOD）を防ぐ仕組み
// 解説: クラスコンポーネントでのみ実装可能（関数コンポーネントでは getDerivedStateFromError が使えない）

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

  // 解説: getDerivedStateFromError = エラーが発生したとき state を更新する静的メソッド（renderフェーズで呼ばれる）
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  // 解説: componentDidCatch = エラーのログ記録等の副作用を処理するメソッド（commitフェーズで呼ばれる）
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  // 解説: handleReload = エラー状態をリセットしてページをリロードする
  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
          <div className="card-bold bg-white p-6 max-w-sm w-full space-y-4">
            {/* @copy CRO-error-boundary-01 Lv0 */}
            <h1 className="font-display text-3xl text-ink">
              うまく表示できませんでした。
            </h1>
            {/* @copy CRO-error-boundary-02 Lv0 */}
            <p className="text-sm text-muted">
              再読み込みすると直るかもしれません。
            </p>
            <button
              onClick={this.handleReload}
              className="w-full h-11 bg-ink text-white font-bold rounded-lg border-2 border-ink"
            >
              {/* @copy CRO-button-boundary-01 Lv0 */}
              再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
