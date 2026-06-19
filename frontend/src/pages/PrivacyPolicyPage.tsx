// 解説: このファイルはプライバシーポリシーページを定義する（/privacy）。
// 解説: Article コンポーネント = 条番号と見出しを受け取る汎用セクション表示コンポーネント（TermsOfServicePage と同構造）
// 解説: このページは法的文書なのでコード変更禁止。施行日: 2026年6月5日（自前起草・法的妥当性はオーナー責任）
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

function Article({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card-bold bg-white p-4 space-y-3">
      <h2 className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide">
        {id}（{title}）
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink">
        {children}
      </div>
    </section>
  )
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 pl-2 border-l-2 border-ink/20">
      <p className="font-bold text-sm">{title}</p>
      {children}
    </div>
  )
}

function Ol({ items }: { items: string[] }) {
  return (
    <ol className="list-none space-y-1 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-mono text-xs shrink-0 mt-0.5">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-mono text-xs shrink-0 mt-0.5">・</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-16">
      {/* @copy CRO-button-privacy-back-01 Lv0 */}
      <Button variant="outline-bold" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        戻る
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* @copy CRO-heading-privacy-01 Lv0 */}
          <h1 className="font-display text-4xl text-ink">プライバシーポリシー</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-ink text-white px-2 py-0.5 inline-block tracking-widest uppercase">
            Cro-co
          </span>
          {/* @copy CRO-label-privacy-effective-01 Lv0 */}
          <span className="font-mono text-xs text-ink/50">施行日: 2026年6月5日</span>
        </div>
      </div>

      {/* @copy CRO-legal-privacy-body-all Lv0 法的条文・文言変更禁止 */}
      {/* 前文 */}
      <div className="card-bold bg-white p-4 space-y-3">
        <p className="text-sm leading-relaxed text-ink">
          本プライバシーポリシー（以下「本ポリシー」といいます）は、マッチングサービス「Cro-co」（以下「本サービス」といいます）における利用者の個人情報の取扱いについて定めるものです。
        </p>
        <p className="text-sm leading-relaxed text-ink">
          本サービスは、大学生が相互に安全にコミュニケーションできる場の提供を目的として運営されます。本サービスは、個人情報の取扱いについて、個人情報の保護に関する法律（以下「個人情報保護法」といいます）その他関係法令およびガイドラインを遵守し、適法かつ適切に管理します。
        </p>
      </div>

      <Article id="第1条" title="個人情報取扱事業者">
        <p>
          本サービスの個人情報取扱事業者は、本サービスを開発・運営する個人（以下「運営者」といいます）です。
        </p>
        <p>
          運営者の氏名等の詳細につきましては、本ポリシー第15条に定めるお問い合わせ窓口を通じてご請求ください。運営者は、本人確認の手続を経たうえで、合理的な範囲で開示します。
        </p>
      </Article>

      <Article id="第2条" title="取得する個人情報の項目">
        <p>運営者は、本サービスの提供にあたり、以下の項目を取得します。</p>
        <Sub title="(1) 認証情報">
          <Ul items={[
            'メールアドレス（現時点では @ecs.osaka-u.ac.jp ドメインのものに限る）',
            'パスワード（暗号学的にハッシュ化された形式で保管）',
          ]} />
        </Sub>
        <Sub title="(2) プロフィール情報">
          <Ul items={[
            '表示名、自己紹介文、ステータスメッセージ',
            '学年、学部、学科、所属サークル、出身地、興味関心',
            'プロフィール写真（最大6枚）。なお、写真は公開前に運営者による適切性の確認を実施します',
            '性別、興味の対象',
          ]} />
        </Sub>
        <Sub title="(3) 本人確認情報（第4条に基づき特別に取り扱います）">
          <Ul items={[
            '本名（氏名）',
            '学籍番号',
            '生年月日',
            '学生証画像',
          ]} />
        </Sub>
        <Sub title="(4) 利用状況情報">
          <Ul items={[
            'マッチング履歴、メッセージ送受信記録、メッセージへのリアクション',
            'いいね、ブロック、通報、非表示、プロフィール閲覧の各履歴',
          ]} />
        </Sub>
        <Sub title="(5) 通知設定">
          <Ul items={[
            'Webプッシュ通知の購読情報（エンドポイントURL、暗号鍵）',
          ]} />
        </Sub>
        <Sub title="(6) お問い合わせ情報">
          <Ul items={[
            'お問い合わせを通じて送信された内容および対応の記録',
          ]} />
        </Sub>
        <Sub title="(7) 端末・アクセス情報">
          <Ul items={[
            'IPアドレス、ブラウザ・端末情報',
            'サービスワーカーおよびIndexedDBに保存されるキャッシュ情報（表示速度の向上のため）',
          ]} />
        </Sub>
      </Article>

      <Article id="第3条" title="利用目的">
        <p>
          運営者は、取得した個人情報を以下の目的のためにのみ利用します。
        </p>
        <Ol items={[
          '本サービスの提供・運営・安定的な稼働',
          '本人確認（在籍大学の現役学生かつ18歳以上であることの確認）',
          '利用者へのお知らせ・本サービスの変更・終了に関する連絡',
          '利用規約違反・不正利用の防止および対応',
          '本サービスの改善・新機能の開発・品質向上のための分析',
          '通報・紛争への対応',
          '法令または公的機関による要請への対応',
        ]} />
        <p>
          運営者は、利用目的を変更する場合、変更後の目的が変更前の目的と相当の関連性を有すると合理的に認められる範囲を超えないものとし、変更後は本ポリシーへの反映と利用者への通知または公表を行います。
        </p>
      </Article>

      <Article id="第4条" title="本人確認情報の特別取扱い">
        <p>
          第2条第3号に定める本人確認情報については、以下のとおり特別に取り扱います。
        </p>
        <Sub title="(1) 取得の目的">
          <p>
            本人確認情報は、利用者が在籍大学の現役学生かつ18歳以上であることの確認、および本サービスの安全性確保のためにのみ取得します。
          </p>
        </Sub>
        <Sub title="(2) 物理削除の時期">
          <p>学生証画像および本名・学籍番号・生年月日の平文データは、以下のタイミングで物理的に削除します。</p>
          <Ul items={[
            '審査において承認された場合: 承認時点から3日以内',
            '審査において不承認となった場合: 不承認時点から30日以内',
            '利用者が退会した場合: 退会手続の完了時点で即時',
          ]} />
          <p>なお、削除実行前の期間（最大3日間）は、本名・学籍番号・生年月日の平文データは、ご本人のみが閲覧できる状態で保持されます。</p>
        </Sub>
        <Sub title="(3) ハッシュ値の保持">
          <p>本名および学籍番号については、物理削除後も以下の目的のためにハッシュ値を1年間保持します。</p>
          <Ul items={[
            '利用規約違反または不正登録を行った利用者の再登録防止',
            '不正行為・キャンペーン悪用等への対応',
            '法令に基づく要請への対応',
          ]} />
          <p className="mt-1">1年間の保持期間が経過した後は、ハッシュ値も物理的に削除します。</p>
        </Sub>
        <Sub title="(4) 削除実行の責任">
          <p>
            物理削除は、運営者が定期的に実行する自動処理によって実施されます。削除実行の記録は内部監査ログとして保持されます。
          </p>
        </Sub>
      </Article>

      <Article id="第5条" title="各情報の保存期間">
        <p>取得する個人情報の保存期間は、以下のとおりです。</p>
        <div className="space-y-1.5">
          {[
            { label: 'プロフィール情報・利用履歴・通知設定', value: '退会時に即時削除' },
            { label: '本人確認情報（平文）', value: '審査完了後3日以内 / 不承認後30日以内 / 退会時即時' },
            { label: 'メッセージ送受信記録', value: '退会後30日間保持後に削除' },
            { label: '本名・学籍番号のハッシュ値', value: '退会後または平文削除後1年間保持後に削除' },
            { label: 'お問い合わせ情報', value: '退会時に即時削除' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-2 py-1.5 border-b border-ink/10 last:border-0">
              <span className="text-sm flex-1">{label}</span>
              <span className="font-mono text-xs text-ink/60 shrink-0 text-right">{value}</span>
            </div>
          ))}
        </div>
        <p>
          法令により保管が義務付けられる記録については、当該義務の範囲内で必要な期間に限り保管します。
        </p>
      </Article>

      <Article id="第6条" title="個人情報の安全管理措置">
        <p>運営者は、個人情報の漏洩、滅失または毀損を防止するため、以下の安全管理措置を講じます。</p>
        <Sub title="(1) 技術的安全管理措置">
          <Ul items={[
            '通信の暗号化（TLS 1.2以上）',
            'データベースへのアクセス制限（認証・権限管理）',
            '認証情報の暗号化保管',
            '学生証画像の非公開ストレージでの管理',
          ]} />
        </Sub>
        <Sub title="(2) 組織的安全管理措置">
          <Ul items={[
            '個人情報へのアクセスを、運営者および承認された管理者に限定',
            '管理者による主要な操作の記録',
          ]} />
        </Sub>
        <Sub title="(3) 人的安全管理措置">
          <Ul items={[
            '個人情報を取り扱う機器の適切な管理',
          ]} />
        </Sub>
      </Article>

      <Article id="第7条" title="個人情報の第三者提供">
        <p>
          運営者は、以下の場合を除き、あらかじめ利用者の同意を得ることなく、個人情報を第三者に提供しません。
        </p>
        <Ol items={[
          '法令に基づく場合',
          '人の生命、身体または財産の保護のために必要であり、利用者の同意を得ることが困難な場合',
          '公衆衛生の向上または児童の健全な育成のために特に必要であり、利用者の同意を得ることが困難な場合',
          '国の機関もしくは地方公共団体またはその委託を受けた者からの法令に定める事務の遂行への協力依頼に応じる必要があり、利用者の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがある場合',
        ]} />
      </Article>

      <Article id="第8条" title="業務委託先">
        <p>運営者は、本サービスの提供にあたり、以下の事業者に業務の一部を委託しています。</p>
        <div className="space-y-1.5">
          {[
            { name: 'Supabase Inc.', purpose: 'データベース・認証・ストレージの提供（米国）' },
            { name: 'Vercel Inc.', purpose: 'フロントエンドホスティング（米国）' },
            { name: 'Render Inc.', purpose: 'バックエンドホスティング（米国）' },
            { name: 'Google LLC', purpose: 'アクセス解析（Google Analytics）・メール配信（米国）※利用者の同意取得を前提として実施（第10条参照）' },
          ].map(({ name, purpose }) => (
            <div key={name} className="flex items-start gap-2 py-1.5 border-b border-ink/10 last:border-0">
              <span className="font-mono text-xs font-bold shrink-0 mt-0.5">{name}</span>
              <span className="text-sm">{purpose}</span>
            </div>
          ))}
        </div>
        <p>
          運営者は、委託先に対し、個人情報の適切な管理に必要な措置を講じるよう監督します。
        </p>
      </Article>

      <Article id="第9条" title="個人情報の越境移転">
        <p>
          第8条に記載のとおり、本サービスは個人情報の一部を日本国外（主としてアメリカ合衆国）に所在する委託先で保管または処理しています。
        </p>
        <p>
          アメリカ合衆国における個人情報の保護に関する制度等の詳細は、個人情報保護委員会のウェブサイトにてご確認いただけます。
        </p>
        <p className="font-mono text-xs text-ink/60">個人情報保護委員会: https://www.ppc.go.jp/</p>
      </Article>

      <Article id="第10条" title="Cookieおよび類似技術の利用">
        <p>本サービスは、以下のCookieおよび類似技術（localStorage、IndexedDB、Service Workerキャッシュ等）を利用します。</p>
        <Sub title="(1) サービス提供に必須の技術">
          <p>
            ログイン状態の維持、利用者の設定の保存、サービスの表示速度向上のために利用します。これらを無効化した場合、本サービスの一部または全部が利用できなくなることがあります。
          </p>
        </Sub>
        <Sub title="(2) アクセス解析（Google Analytics）— 外部送信について">
          <p>
            運営者は、利用者の同意を得た場合に限り、Google LLC の提供する Google Analytics を利用し、本サービスの利用状況を解析します。同意した場合、利用者の端末から Google LLC に対し、次の情報が送信されます。
          </p>
          <Ul items={[
            '送信される情報の内容：Cookie 等の識別子、閲覧したページの URL、リファラー、IPアドレス、ブラウザ・端末情報、利用日時等',
            '送信先（情報を取り扱う者）：Google LLC（アメリカ合衆国）',
            '利用目的：本サービスのアクセス状況の分析およびサービス品質の向上',
          ]} />
          <p>
            同意は登録画面の任意項目で取得し、同意しない場合 Google Analytics は読み込まれず、上記の送信は行われません。同意後も、ブラウザの設定または Google Analytics オプトアウト アドオン（<a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer" className="underline break-all">https://tools.google.com/dlpage/gaoptout?hl=ja</a>）により送信を停止できます。なお、本サービスの提供に必要不可欠な Cookie 等（ログイン状態の維持等）は本項の対象外です。
          </p>
        </Sub>
        <Sub title="(3) Webプッシュ通知">
          <p>
            マッチングやメッセージ受信の通知のために、Webプッシュ通知（VAPID方式）を利用します。プッシュ通知の購読解除は、ブラウザの設定画面、または本サービスの通知設定画面からいつでも行えます。
          </p>
        </Sub>
      </Article>

      <Article id="第11条" title="未成年者の取扱い">
        <p>
          本サービスは、利用者の年齢が18歳以上であることを登録時に確認します。確認は、生年月日の自己申告および学生証画像の目視審査の2段階で実施します。
        </p>
        <p>
          万が一18歳未満の利用者からの個人情報の取得が判明した場合、運営者は当該利用者のアカウントを停止し、保有する個人情報を遅滞なく削除します。
        </p>
      </Article>

      <Article id="第12条" title="退会および個人情報の削除">
        <p>
          利用者は、本サービス内のアカウント設定画面から、いつでも退会（アカウントの削除）を申し出ることができます。退会手続の完了時点で、以下のとおり個人情報を取り扱います。
        </p>
        <Sub title="(1) 即時に物理削除する情報">
          <p>プロフィール情報、いいね・ブロック・通報・非表示・閲覧履歴、通知設定、お問い合わせ情報</p>
        </Sub>
        <Sub title="(2) 退会後30日間保持した後に物理削除する情報">
          <p>メッセージ送受信記録およびメッセージへのリアクションは、利用規約違反の調査および紛争解決のために退会後30日間保持します。保持期間中は当該利用者を含む第三者が閲覧できない状態で管理し、30日の経過後に物理的に削除します。</p>
        </Sub>
        <Sub title="(3) 退会後1年間保持した後に物理削除する情報">
          <p>本名および学籍番号のハッシュ値は、不正登録防止等の目的のため1年間保持します。1年経過後は物理的に削除します。</p>
        </Sub>
        <Sub title="(4) 退会後の他の利用者からの参照">
          <p>退会後、当該利用者のプロフィールおよび他の利用者との間で送受信されたメッセージ等の記録は、退会時点をもって他の利用者の画面から参照できなくなります。</p>
        </Sub>
        <Sub title="(5) 例外">
          <p>法令の定めにより一定期間の保管が義務付けられている記録、および紛争解決のため合理的に必要となる記録については、当該義務または必要性の範囲内で必要な最低限の期間に限り保管する場合があります。</p>
        </Sub>
      </Article>

      <Article id="第13条" title="個人情報の漏洩等が発生した場合の対応">
        <p>
          運営者は、個人情報の漏洩、滅失、毀損その他の安全の確保に係る事態が生じた場合、個人情報保護法第26条の定めに従い、以下の対応を行います。
        </p>
        <Ol items={[
          '個人情報保護委員会への速やかな報告',
          '影響を受ける利用者への個別通知（通知が困難な場合は、本サービス上での公表）',
          '再発防止策の実施',
        ]} />
      </Article>

      <Article id="第14条" title="開示・訂正・利用停止等の請求">
        <p>
          利用者は、運営者に対し、個人情報保護法に基づき、自己の個人情報について以下の請求を行うことができます。
        </p>
        <Ol items={[
          '利用目的の通知',
          '開示（電磁的記録の提供を含む）',
          '内容の訂正、追加または削除',
          '利用の停止または消去',
          '第三者提供の停止',
        ]} />
        <p>
          請求方法は、第15条に定めるお問い合わせ窓口までご連絡ください。運営者は、ご本人様確認のうえ、法令に定める期間内に対応します。
        </p>
      </Article>

      <Article id="第15条" title="お問い合わせおよび苦情申し出窓口">
        <p>
          本ポリシーおよび個人情報の取扱いに関するお問い合わせ・苦情の申し出、ならびに第14条に定める請求は、以下までご連絡ください。
        </p>
        <div className="card-bold bg-brand/20 p-3">
          <p className="font-mono text-xs font-bold text-ink">メールアドレス</p>
          <p className="font-mono text-sm text-ink mt-0.5">support@crocoweb.jp</p>
        </div>
        <p>
          なお、本サービスは現在、個人情報保護法に基づく認定個人情報保護団体に加入していません。個人情報の取扱いに関して問題が解決しない場合は、個人情報保護委員会（https://www.ppc.go.jp/）にご相談いただくことも可能です。
        </p>
      </Article>

      <Article id="第16条" title="本ポリシーの改定">
        <p>
          運営者は、法令の変更または本サービスの内容の変更等に応じ、本ポリシーを改定することがあります。
        </p>
        <p>
          重要な改定を行う場合は、本サービス内での通知または利用者の登録メールアドレス宛ての通知により、改定内容および改定の効力発生日を事前にお知らせします。
        </p>
        <p>
          利用者が改定の効力発生日以降に本サービスを利用した場合、改定後の本ポリシーに同意したものとみなします。
        </p>
      </Article>

      {/* 附則 */}
      <div className="card-bold bg-white p-4">
        <p className="font-mono text-xs font-bold bg-ink text-white px-3 py-1 inline-block uppercase tracking-wide mb-3">
          附則
        </p>
        <p className="font-mono text-xs text-ink/60">本ポリシーは、2026年6月5日に施行します。</p>
      </div>
    </div>
  )
}
