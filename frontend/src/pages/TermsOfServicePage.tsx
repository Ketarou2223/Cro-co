import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
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
        <h1 className="font-display text-3xl text-ink">利用規約</h1>
        <span className="font-mono text-xs bg-ink text-white px-2 py-0.5 inline-block">
          LAST UPDATED: 2026.01.01
        </span>
      </div>

      <p className="text-gray-700 leading-relaxed mb-4">
        本利用規約（以下「本規約」）は、Cro-co（以下「本サービス」）の利用条件を定めるものです。
        利用者は本規約に同意したうえで本サービスを利用するものとします。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        1. サービス概要
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本サービスは、大阪大学の学生を対象とした限定マッチングアプリです。
        学内の学生同士が安心して交流できる場を提供することを目的としています。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        2. 利用資格
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本サービスを利用できるのは、以下の条件をすべて満たす方に限ります。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>大阪大学の現役学生であること</li>
        <li>@ecs.osaka-u.ac.jp ドメインのメールアドレスを所持していること</li>
        <li>学生証による本人確認を完了していること</li>
        <li>満18歳以上であること</li>
      </ul>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        3. 禁止事項
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        利用者は、以下の行為を行ってはなりません。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>虚偽の情報を登録・記載すること</li>
        <li>他のユーザーになりすますこと</li>
        <li>他のユーザーへのハラスメント・誹謗中傷・脅迫</li>
        <li>商業目的での利用（勧誘・広告・販売活動など）</li>
        <li>マッチング・交流以外を目的とした勧誘行為（宗教・ネットワークビジネス等）</li>
        <li>わいせつなコンテンツの送信・掲載</li>
        <li>本サービスのシステムに不正にアクセスする行為</li>
        <li>その他、運営者が不適切と判断する行為</li>
      </ul>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        4. アカウントの停止・削除
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        利用者が本規約に違反した場合、運営者は予告なくアカウントを停止または削除することがあります。
        停止・削除に伴う不利益について、運営者は一切の責任を負いません。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        5. 免責事項
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        運営者は、以下について一切の責任を負いません。
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed mb-4 space-y-1">
        <li>マッチングの成立・不成立</li>
        <li>交際・友人関係の成否</li>
        <li>利用者間で生じたトラブル・損害</li>
        <li>サービスの中断・停止によって生じた損害</li>
        <li>ユーザーが投稿・送信したコンテンツの内容</li>
      </ul>
      <p className="text-gray-700 leading-relaxed mb-4">
        利用者同士のやり取りはすべて利用者の自己責任で行うものとします。
        トラブルが発生した場合は、当事者間で解決してください。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        6. サービスの変更・終了
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        運営者は、予告なく本サービスの内容を変更、または提供を終了することがあります。
        これによって利用者に生じた損害について、運営者は責任を負いません。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        7. 規約の変更
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        運営者は、必要に応じて本規約を変更することがあります。
        変更後の規約は本サービス上に掲示した時点から効力を持ちます。
      </p>

      <h2 className="bg-ink text-white inline-block px-2 py-0.5 text-sm font-bold mb-3 mt-8">
        8. 準拠法
      </h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        本規約は日本法に準拠し、日本法に従って解釈されます。
        本サービスに関する紛争については、大阪地方裁判所を第一審の専属的合意管轄裁判所とします。
      </p>

      <p className="font-mono text-gray-400 text-xs mt-10">制定日: 2026年1月1日</p>
    </div>
  )
}
