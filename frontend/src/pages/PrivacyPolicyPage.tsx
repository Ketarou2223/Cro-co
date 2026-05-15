import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Button
        variant="outline-bold"
        size="sm"
        className="mb-8"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        戻る
      </Button>

      <div className="space-y-2 mb-8">
        <h1 className="font-display text-3xl text-ink">プライバシーポリシー</h1>
        <span className="font-mono text-xs bg-ink text-white px-2 py-0.5 inline-block">
          LAST UPDATED: 2026.01.01
        </span>
      </div>

      <p className="text-gray-700 leading-relaxed mb-4">
        本プライバシーポリシーは、Cro-co（以下「本サービス」）における個人情報の取り扱いについて定めるものです。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        1. 運営者情報
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本サービスは、大阪大学に在籍する個人が開発・運営する、大阪大学生限定のマッチングサービスです。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        2. 収集する情報
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本サービスでは、以下の情報を収集します。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>メールアドレス（@ecs.osaka-u.ac.jp）</li>
        <li>プロフィール情報（ニックネーム・自己紹介・学年・所属など）</li>
        <li>プロフィール写真</li>
        <li>学生証の画像（本人確認のためのみ使用）</li>
        <li>ユーザー間のメッセージ内容</li>
        <li>サービス利用状況（アクセス日時など）</li>
      </ul>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        3. 利用目的
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        収集した情報は、以下の目的で利用します。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>マッチングサービスの提供・運営</li>
        <li>本人確認（学生証による大阪大学在籍の確認）</li>
        <li>不正利用の防止・安全管理</li>
        <li>利用規約違反への対応</li>
        <li>サービス改善のための分析</li>
      </ul>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        4. 第三者への提供
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        運営者は、原則として利用者の個人情報を第三者に提供しません。ただし、以下の場合を除きます。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>法令に基づき開示が求められる場合</li>
        <li>人の生命・身体・財産の保護のために必要であり、本人の同意を得ることが困難な場合</li>
      </ul>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        5. 情報の保存期間
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        利用者がアカウントを退会した場合、退会後30日以内にすべての個人情報を削除します。
        ただし、法令上の義務により保存が必要な情報については、当該義務の期間中保持することがあります。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        6. セキュリティ
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        運営者は、収集した個人情報の漏洩・滅失・毀損を防止するため、適切な技術的・組織的安全管理措置を講じます。
        ただし、インターネット上の完全な安全性を保証するものではありません。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        7. お問い合わせ
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本ポリシーに関するお問い合わせは、下記メールアドレスまでご連絡ください。
      </p>
      <p className="text-gray-700 leading-relaxed mb-4">
        メール: <span className="font-mono font-medium">support@cro-co.example.com</span>
      </p>

      <p className="font-mono text-gray-400 text-xs mt-10">制定日: 2026年1月1日</p>
    </div>
  )
}
