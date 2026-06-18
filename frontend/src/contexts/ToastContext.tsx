// 解説: このファイルはトースト通知の状態管理と全コンポーネントへの提供を担うコンテキストを定義する。
// 解説: 呼ばれる場所: main.tsx で <ToastProvider> として全ページをラップする
// 解説: 使い方: const { showToast } = useToast() として呼ぶだけでトースト表示ができる
// 解説: Context = React の「グローバル状態」機構（props バケツリレーを使わずに値を全ツリーに共有）

import { createContext, useContext, useState, type ReactNode } from 'react'
import { Toast } from '@/components/Toast'

// 解説: ToastContextValue = コンテキストから提供する値の型定義
type ToastContextValue = {
  showToast: (message: string) => void
}

// 解説: createContext = コンテキストオブジェクトを作る（null = デフォルト値・Provider 外では使えない）
const ToastContext = createContext<ToastContextValue | null>(null)

// 解説: ToastProvider = toastState を管理し、Toast コンポーネントと showToast 関数を子孫に提供する
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  // 解説: show = true のとき Toast コンポーネントが画面に表示される
  const [show, setShow] = useState(false)

  // 解説: showToast(msg) = メッセージをセットして表示状態にする
  const showToast = (msg: string) => {
    setMessage(msg)
    setShow(true)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {/* 解説: children = <App /> 全体。Provider の子孫全員が useToast() を使える */}
      {children}
      {/* 解説: Toast = 実際のトースト UI（duration 後に onClose で show=false になる） */}
      <Toast message={message} show={show} onClose={() => setShow(false)} />
    </ToastContext.Provider>
  )
}

// 解説: useToast() = ToastContext を取得するカスタムフック（Provider 外で使うとエラー）
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
