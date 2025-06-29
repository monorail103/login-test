import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import RegisterForm from './register-form';

export default async function RegisterPage() {
  const user = await verifySession();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          新規アカウント登録
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}