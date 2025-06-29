'use server';

import { z } from 'zod';
import prisma from './prisma';
import bcrypt from 'bcrypt';
import { cookies, headers } from 'next/headers';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
import { verifySession } from './session'; // ユーザー情報を得るためにインポート
import { createSession, logout as performLogout } from './session'; // session.tsからインポート
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const RegisterSchema = z.object({
  name: z.string().min(1, { message: "名前は必須です。" }),
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(8, { message: "パスワードは最低8文字以上である必要があります。" }),
});

export type State = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};

// ログインフォーム用のState型
export type LoginState = {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string | null;
};


// 2FAセットアップの状態を定義
export type TwoFactorSetupState = {
  qrCodeUrl?: string;
  secret?: string; // 本番環境では返すべきではないが、学習用として一時的に返す
  error?: string;
};

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const h = await headers();
  const ip = h.get('cf-connecting-ip'); // Cloudflare経由の場合

  const formData = new FormData();
  formData.append('secret', secret!);
  formData.append('response', token);
  if (ip) {
    formData.append('remoteip', ip);
  }

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const outcome = await result.json();
  return outcome.success;
}

export async function register(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '入力内容に誤りがあります。',
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    const token = formData.get('cf-turnstile-response') as string;
    const isHuman = await verifyTurnstile(token);

    if (!isHuman) {
      return { message: 'CAPTCHAの検証に失敗しました。もう一度お試しください。' };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return {
        errors: { email: ["このメールアドレスは既に使用されています。"] },
        message: '登録に失敗しました。'
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    await createSession(user.id);

    // ★ 変更: 登録成功後にダッシュボードへリダイレクト
    redirect('/dashboard');

  } catch (error) {
    // ★ 変更点: redirectによるエラーを再throwする
    if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(error);
    return {
      message: 'サーバーエラーが発生しました。時間をおいて再度お試しください。',
    };
  }
}

// ログイン用の入力スキーマ
const LoginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(1, { message: "パスワードを入力してください。" }), // ログイン時は空でないことだけをチェック
});

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '入力内容に誤りがあります。',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return { message: "メールアドレスまたはパスワードが正しくありません。" };
    }

    if (user.isTwoFactorEnabled) {
      (await cookies()).set('2fa_user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 5,
        path: '/',
      });
      redirect('/login/2fa');
    }
    
    await createSession(user.id);
    redirect('/dashboard');

  } catch (error) {
    // ★ 変更点: redirectによるエラーを再throwする
    if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(error);
    return {
      message: 'サーバーエラーが発生しました。時間をおいて再度お試しください。',
    };
  }
}

// 2FAのセットアップ情報を生成するアクション
export async function generateTwoFactorSetup() {
  const user = await verifySession();
  if (!user) throw new Error('認証されていません。');

  // otplibを使って秘密鍵を生成
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'login-test', secret);

  // 秘密鍵を一時的にDBに保存 (まだ有効化はしない)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret },
  });

  // QRコードを生成
  const qrCodeDataUrl = await toDataURL(otpauth);

  return { qrCodeDataUrl };
}

// 2FAを検証し、有効化するアクション
export async function enableTwoFactor(formData: FormData) {
  const user = await verifySession();
  if (!user || !user.twoFactorSecret) {
    return { success: false, message: '不正な操作です。' };
  }
  
  const code = formData.get('code') as string;

  // 提出されたコードが正しいか検証
  const isValid = authenticator.check(code, user.twoFactorSecret);

  if (!isValid) {
    return { success: false, message: 'コードが正しくありません。' };
  }

  // 2FAを有効化
  await prisma.user.update({
    where: { id: user.id },
    data: { isTwoFactorEnabled: true },
  });

  // 既存のリカバリーコードを削除
  await prisma.recoveryCode.deleteMany({ where: { userId: user.id } });

  // 新しいリカバリーコードを10個生成
  const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(8).toString('hex'));
  
  await prisma.recoveryCode.createMany({
    data: recoveryCodes.map(code => ({ code, userId: user.id })),
  });

  return { success: true, recoveryCodes };
}

// 2FAコードを検証してログインを完了するアクション
export async function verifyTwoFactorCode(prevState: any, formData: FormData) {
  const code = formData.get('code') as string;
  const userId = (await cookies()).get('2fa_user_id')?.value;

  if (!userId) {
    return { message: 'セッションが切れました。もう一度ログインからやり直してください。' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    return { message: '不正な操作です。' };
  }
  
  const isValid = authenticator.check(code, user.twoFactorSecret);

  if (!isValid) {
    const recoveryCode = await prisma.recoveryCode.findFirst({
        where: { userId: user.id, code: code, used: false }
    });

    if (recoveryCode) {
        await prisma.recoveryCode.update({
            where: { id: recoveryCode.id },
            data: { used: true }
        });
    } else {
        return { message: 'コードが正しくありません。' };
    }
  }

  (await cookies()).delete('2fa_user_id');

  await createSession(user.id);
  
  // ★ 変更点: ログイン完了後にダッシュボードへリダイレクト
  redirect('/dashboard');
}

// セッションを破棄（削除）するサーバーアクション
export async function revokeSession(sessionId: string) {
  try {
    const user = await verifySession();
    if (!user) {
      return { error: '認証されていません。' };
    }

    // 削除しようとしているセッションが本当に自分のものか確認
    const sessionToRevoke = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionToRevoke || sessionToRevoke.userId !== user.id) {
      return { error: 'このセッションを削除する権限がありません。' };
    }

    // データベースからセッションを削除
    await prisma.session.delete({
      where: { id: sessionId },
    });
    
    // ページを再検証して表示を更新
    revalidatePath('/dashboard/sessions');
    return { success: true, message: 'セッションを正常に破棄しました。' };

  } catch (error) {
    console.error(error);
    return { error: 'セッションの破棄中にエラーが発生しました。' };
  }
}

// ログアウト用のアクション
export async function logoutAction() {
  await performLogout();
}


