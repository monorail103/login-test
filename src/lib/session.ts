import 'server-only'; // このモジュールがサーバーサイドでのみ使用されることを保証
import { cookies } from 'next/headers';
import prisma from './prisma';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'session_id';

/**
 * 新しいセッションを作成し、Cookieを設定します。
 * @param userId - セッションを作成するユーザーのID
 */
export async function createSession(userId: string) {
  // セッションの有効期限（例: 24時間後）
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // データベースにセッションを作成
  const session = await prisma.session.create({
    data: {
      userId: userId,
      expiresAt: expiresAt,
    },
  });

  // クライアントにCookieを設定
  (await cookies()).set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true, // JavaScriptからのアクセスを禁止
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
    expires: expiresAt, // Cookieの有効期限
    sameSite: 'lax', // CSRF対策
    path: '/', // アプリケーション全体で有効
  });

  // 認証後のページ（ダッシュボードなど）へリダイレクト
  redirect('/dashboard');
}

/**
 * 現在のセッションを検証し、ユーザー情報を返します。
 * @returns 認証されていればユーザー情報、そうでなければnull
 */
export async function verifySession() {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  // データベースでセッションを検索し、関連するユーザー情報も取得
  const session = await prisma.session.findUnique({
    where: { 
      id: sessionId,
      // 有効期限が切れていないことを確認
      expiresAt: {
        gt: new Date(),
      }
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  // セッションが見つかればユーザー情報を返す
  return session.user;
}

/**
 * ログアウト処理。セッションをDBから削除し、Cookieを無効化します。
 */
export async function logout() {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // データベースからセッションを削除
    await prisma.session.delete({
      where: { id: sessionId },
    }).catch(console.error); // 存在しない場合のエラーは無視

    // クライアントのCookieを削除（有効期限を過去に設定）
    (await cookies()).set(SESSION_COOKIE_NAME, '', {
      expires: new Date(0),
    });
  }
  
  // ログインページにリダイレクト
  redirect('/login');
}