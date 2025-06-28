'use server';

import { z } from 'zod';
import prisma from './prisma';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
import { verifySession } from './session'; // ユーザー情報を得るためにインポート
import { createSession, logout as performLogout } from './session'; // session.tsからインポート

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

    // ★ 変更点: ユーザー作成後にセッションを作成する
    await createSession(user.id);

    // createSession内でリダイレクトされるため、ここでのreturnは通常到達しない
    return {};

  } catch (error) {
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
    // 1. メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // ユーザーが存在しない場合でも、パスワード検証と同じエラーメッセージを返す
      // これにより、メールアドレスの存在を攻撃者に推測させない（ユーザー列挙攻撃の対策）
      return { message: "メールアドレスまたはパスワードが正しくありません。" };
    }

    // 2. パスワードを比較
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { message: "メールアドレスまたはパスワードが正しくありません。" };
    }

    if (user.isTwoFactorEnabled) {
      // 2FAが有効な場合、一時的なCookieにユーザーIDを保存し、2FAページへ
      (await cookies()).set('2fa_user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 5, // 5分間有効
        path: '/',
      });
      redirect('/login/2fa');
    }
    
    // 3. 認証成功、セッションを作成してリダイレクト
    // 登録時に作成したcreateSession関数を再利用
    await createSession(user.id);
    
    // createSession内でリダイレクトされるため、ここは通常到達しない
    return {};

  } catch (error) {
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
  const otpauth = authenticator.keyuri(user.email, 'YourAppName', secret); // 'YourAppName'はアプリ名に置き換える

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
    // リカバリーコードも試す
    const recoveryCode = await prisma.recoveryCode.findFirst({
        where: { userId: user.id, code: code, used: false }
    });

    if (recoveryCode) {
        // リカバリーコードを使用済みにする
        await prisma.recoveryCode.update({
            where: { id: recoveryCode.id },
            data: { used: true }
        });
    } else {
        return { message: 'コードが正しくありません。' };
    }
  }

  // 一時的なCookieを削除
  (await cookies()).delete('2fa_user_id');

  // セッションを作成してログイン完了
  await createSession(user.id);
  return {}; // createSession内でリダイレクトされる
}

// ログアウト用のアクション
export async function logoutAction() {
  await performLogout();
}

function redirect(arg0: string) {
  throw new Error('Function not implemented.');
}
