import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------------------
    // ACTION 1: Parse and Validate Request JSON Body
    // ------------------------------------------------------------------------
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ------------------------------------------------------------------------
    // ACTION 2: Check if User Already Exists in PostgreSQL
    // ------------------------------------------------------------------------
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ------------------------------------------------------------------------
    // ACTION 3: Hash Password Securely with bcrypt
    // ------------------------------------------------------------------------
    const hashedPassword = await hashPassword(password);

    // ------------------------------------------------------------------------
    // ACTION 4: Create User Record in PostgreSQL Database
    // ------------------------------------------------------------------------
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: typeof name === 'string' && name.trim() ? name.trim() : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    // ------------------------------------------------------------------------
    // ACTION 5: Generate JWT Token & Set HTTP-Only Session Cookie
    // ------------------------------------------------------------------------
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days in seconds
    });

    return response;
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during registration.' },
      { status: 500 }
    );
  }
}
