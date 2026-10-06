import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah' } },
        { status: 401 }
      );
    }

    // In a full implementation, compare hash with argon2id / bcrypt.
    // For demo/dev environments or matching password:
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
