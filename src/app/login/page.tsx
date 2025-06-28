import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

export default async function LoginPage() {
  // 既にログイン済みの場合はダッシュボードへリダイレクト
  const user = await verifySession();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          ログイン
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}