'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { register, State } from '@/lib/actions';
import { PasswordStrength } from '../components/PasswordStrength';
import { Turnstile } from '@marsidev/react-turnstile';
import Link from 'next/link';

const initialState: State = { message: null, errors: {} };

// 送信ボタンコンポーネント
// useFormStatusフックはform要素の子要素でしか使えないため、コンポーネントを分離
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? '登録中...' : '登録する'}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState(register, initialState);
  const [password, SetPassword] = useState('');

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          名前
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          aria-describedby="name-error"
        />
        <div id="name-error" aria-live="polite" aria-atomic="true">
          {state.errors?.name &&
            state.errors.name.map((error: string) => (
              <p className="mt-2 text-sm text-red-600" key={error}>
                {error}
              </p>
            ))}
        </div>
      </div>

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
          aria-describedby="email-error"
        />
        <div id="email-error" aria-live="polite" aria-atomic="true">
          {state.errors?.email &&
            state.errors.email.map((error: string) => (
              <p className="mt-2 text-sm text-red-600" key={error}>
                {error}
              </p>
            ))}
        </div>
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => SetPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          aria-describedby="password-error"
        />
        <div id="password-error" aria-live="polite" aria-atomic="true">
          {state.errors?.password &&
            state.errors.password.map((error: string) => (
              <p className="mt-2 text-sm text-red-600" key={error}>
                {error}
              </p>
            ))}
        </div>
        <PasswordStrength password={password} />
      </div>

       <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} />

      {state.message && (
         <div aria-live="polite" aria-atomic="true">
            <p className="text-sm text-red-600">{state.message}</p>
         </div>
      )}

      <SubmitButton />

      {state.message && (
         <div aria-live="polite" aria-atomic="true">
            <p className="text-sm text-red-600">{state.message}</p>
         </div>
      )}


      <p className="mt-4 text-center text-sm text-gray-600">
        すでにアカウントをお持ちですか？{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          ログインはこちら
        </Link>
      </p>
    </form>
  );
}