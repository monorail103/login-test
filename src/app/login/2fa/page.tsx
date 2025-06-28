'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { verifyTwoFactorCode } from '@/lib/actions'; // 後で作成するアクション

type State = {
  message?: string;
};

const initialState: State = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md">
      {pending ? '検証中...' : '検証してログイン'}
    </button>
  );
}

export default function TwoFactorLoginPage() {
  const [state, formAction] = useFormState(verifyTwoFactorCode, initialState);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-bold text-center">二要素認証</h1>
        <p className="text-center text-sm text-gray-600">認証アプリを開いて6桁のコードを入力してください。</p>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="code">認証コード</label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          {state.message && <p className="text-red-500">{state.message}</p>}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}