import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ message: 'Logged out' });

    // Clear cookie
    response.cookies.delete('auth_token');

    return response;
}
