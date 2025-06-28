'use client';

import { useState, useEffect } from 'react';
import { generateTwoFactorSetup, enableTwoFactor } from '@/lib/actions';
import Link from 'next/link';

type SetupState = {
  qrCodeDataUrl?: string;
  error?: string;
};

type EnableState = {
  success: boolean;
  message?: string;
  recoveryCodes?: string[];
};

export default function TwoFactorSetupPage() {
  const [setupState, setSetupState] = useState<SetupState>({});
  const [enableState, setEnableState] = useState<EnableState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateTwoFactorSetup()
      .then(setSetupState)
      .catch((err) => setSetupState({ error: err.message }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleEnableSubmit = async (formData: FormData) => {
    const result = await enableTwoFactor(formData);
    setEnableState(result);
  };

  if (isLoading) {
    return <div className="p-8">読み込み中...</div>;
  }

  if (setupState.error) {
    return <div className="p-8 text-red-500">エラー: {setupState.error}</div>;
  }
  
  if (enableState?.success) {
    return (
        <div className="max-w-xl mx-auto my-10 p-8 border rounded-lg">
            <h1 className="text-2xl font-bold text-green-600">2FAが有効になりました！</h1>
            <p className="mt-4">以下のリカバリーコードを安全な場所に保管してください。各コードは一度しか使用できません。</p>
            <div className="mt-4 p-4 bg-gray-100 rounded-md font-mono grid grid-cols-2 gap-2">
                {enableState.recoveryCodes?.map(code => <span key={code}>{code}</span>)}
            </div>
            <Link href="/dashboard" className="mt-6 inline-block text-blue-600 hover:underline">ダッシュボードに戻る</Link>
        </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto my-10 p-8 border rounded-lg">
      <h1 className="text-2xl font-bold">多要素認証(2FA)を有効にする</h1>
      <p className="mt-4">1. 認証アプリ（Google Authenticatorなど）で以下のQRコードをスキャンしてください。</p>
      {setupState.qrCodeDataUrl && <img src={setupState.qrCodeDataUrl} alt="2FA QR Code" className="mx-auto my-4" />}
      <p className="mt-4">2. アプリに表示された6桁のコードを入力して、設定を完了してください。</p>
      
      <form action={handleEnableSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">認証コード</label>
          <input
            id="code"
            name="code"
            type="text"
            required
            maxLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        {enableState?.message && <p className="text-red-500">{enableState.message}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md">有効化する</button>
      </form>
    </div>
  );
}