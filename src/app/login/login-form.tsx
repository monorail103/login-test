'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { login, LoginState } from '@/lib/actions';
import Link from 'next/link';

const initialState: LoginState = { message: null, errors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? 'ログイン中...' : 'ログイン'}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {state.errors?.email && (
          <p className="mt-2 text-sm text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {state.errors?.password && (
          <p className="mt-2 text-sm text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      {state.message && (
        <div aria-live="polite" aria-atomic="true">
          <p className="text-sm text-red-600">{state.message}</p>
        </div>
      )}

      <SubmitButton />

      <p className="mt-4 text-center text-sm text-gray-600">
        アカウントをお持ちでないですか？{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
          新規登録はこちら
        </Link>
      </p>
    </form>
  );
}