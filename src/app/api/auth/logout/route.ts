import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Create response with cleared cookies
    const response = NextResponse.json({
      message: 'Logout successful'
    });

    // Clear all auth cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);

    // Even if there's an error, clear cookies
    const response = NextResponse.json({
      message: 'Logout completed'
    });

    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');

    return response;
  }
}

export async function GET(req: NextRequest) {
  // Handle GET request for logout (useful for direct navigation)
  return POST(req);
}
