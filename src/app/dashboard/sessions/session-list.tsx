'use client';

import type { Session } from '@prisma/client';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { revokeSession } from '@/lib/actions';

function RevokeButton({ isCurrent }: { isCurrent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || isCurrent}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      aria-disabled={pending || isCurrent}
    >
      {isCurrent ? '（現在のセッション）' : (pending ? '破棄中...' : 'セッションを破棄')}
    </button>
  );
}

export default function SessionList({ sessions, currentSessionId }: { sessions: Session[], currentSessionId: string | undefined }) {
  const [state, formAction] = useActionState(
    async (state: any, formData: FormData) => {
      const sessionId = formData.get('sessionId') as string;
      return await revokeSession(sessionId);
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        return (
          <div
            key={session.id}
            className={`p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
          >
            <div>
              <p className="font-semibold break-all">
                {session.userAgent || '不明なデバイス'}
              </p>
              <p className="text-sm text-gray-600">
                IPアドレス: {session.ipAddress || '不明'}
              </p>
              <p className="text-sm text-gray-500">
                作成日時: {new Date(session.createdAt).toLocaleString('ja-JP')}
              </p>
            </div>
            <form action={formAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <RevokeButton isCurrent={isCurrent} />
            </form>
          </div>
        );
      })}
    </div>
  );
}