import React from 'react';

// パスワードの強度を判定する単純なロジック
const checkPasswordStrength = (password: string) => {
  let score = 0;
  if (!password) return -1;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
};

const strengthLevels = [
  { label: '非常に弱い', color: 'bg-red-500' },
  { label: '弱い', color: 'bg-orange-500' },
  { label: '普通', color: 'bg-yellow-500' },
  { label: '強い', color: 'bg-green-400' },
  { label: '非常に強い', color: 'bg-green-600' },
];

export function PasswordStrength({ password }: { password: string }) {
  const score = checkPasswordStrength(password);

  if (score === -1) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600">
        <span>パスワード強度: {strengthLevels[score].label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div
          className={`h-2 rounded-full ${strengthLevels[score].color}`}
          style={{ width: `${((score + 1) / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}