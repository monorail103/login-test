import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import SessionList from './session-list';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function SessionsPage() {
  const user = await verifySession();
  if (!user) {
    redirect('/login');
  }

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const currentSessionId = (await cookies()).get('session_id')?.value;

  return (
    <div className="max-w-4xl mx-auto my-10 p-8">
      <h1 className="text-3xl font-bold mb-6">セッション管理</h1>
      <p className="mb-8 text-gray-600">現在アクティブなセッションの一覧です。不要なセッションや見に覚えのないセッションは破棄することができます。</p>
      {sessions.length > 0 ? (
        <SessionList sessions={sessions} currentSessionId={currentSessionId} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>アクティブなセッションがありません。</p>
        </div>
      )}
      <div className="mt-8">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          &larr; ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}