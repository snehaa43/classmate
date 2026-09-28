import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------------------
    // ACTION 1: Parse and Validate Request JSON Body
    // ------------------------------------------------------------------------
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Please provide both email and password.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ------------------------------------------------------------------------
    // ACTION 2: Find User in PostgreSQL Database
    // ------------------------------------------------------------------------
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 3: Verify Password with bcrypt
    // ------------------------------------------------------------------------
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 4: Generate JWT Token & Set HTTP-Only Session Cookie
    // ------------------------------------------------------------------------
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    };

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: safeUser
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during login.' },
      { status: 500 }
    );
  }
}
