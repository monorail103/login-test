import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import Link from 'next/link';

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600"
      >
        ログアウト
      </button>
    </form>
  );
}

export default async function DashboardPage() {
  // サーバーコンポーネントの先頭でセッションを検証
  const user = await verifySession();

  // 認証されていない場合はログインページにリダイレクト
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          ようこそ、{user.name}さん！
        </h1>
        <p className="mt-2 text-gray-600">
          ここは認証されたユーザーのみが見れるダッシュボードです。
        </p>
        <p className="mt-1 text-sm text-gray-500">
          あなたのメールアドレス: {user.email}
        </p>
        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-semibold">セキュリティ設定</h2>
          <p className="mt-2 text-gray-600">
            多要素認証(2FA)は現在
            <span className={user.isTwoFactorEnabled ? "font-bold text-green-600" : "font-bold text-red-600"}>
              {user.isTwoFactorEnabled ? '有効' : '無効'}
            </span>
            です。
          </p>
          <Link href="/dashboard/2fa-setup" className="mt-2 inline-block text-blue-600 hover:underline">
            {user.isTwoFactorEnabled ? '2FA設定を管理' : '2FAを有効にする'}
          </Link>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}