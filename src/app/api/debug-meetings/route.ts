import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import jwt from 'jsonwebtoken';

const verifyToken = (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
        return null;
    }
};

export async function GET(req: Request) {
    try {
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Get all meetings for debugging
        const meetings = await Meeting.find({})
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        return NextResponse.json({ 
            meetings,
            count: meetings.length,
            userRole: user.role
        });

    } catch (error) {
        console.error('Error fetching meetings for debug:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
