import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Username dan password wajib diisi' } },
        { status: 400 }
      );
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));

      if (!user) {
        return NextResponse.json(
          { error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah' } },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      });
    } catch {
      // In-memory fallback for demo/development
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          username,
          displayName: username === 'owner' ? 'Owner Stokara' : 'Staff Kasir',
          role: username === 'owner' ? 'OWNER' : 'KASIR',
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message } },
      { status: 500 }
    );
  }
}
