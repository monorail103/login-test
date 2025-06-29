import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const user = await verifySession();

  // ログイン済みの場合はダッシュボードにリダイレクト
  if (user) {
    redirect('/dashboard');
  }

  // 未ログインの場合は、ログイン・新規登録ページへのリンクを表示
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-10 bg-white rounded-lg shadow-xl text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          ようこそ！
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          始めるには、ログインまたは新規登録をしてください。
        </p>
        <div className="flex justify-center gap-x-4">
          <Link
            href="/login"
            className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors duration-300"
          >
            新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}