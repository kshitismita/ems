import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
        return null;
    }
};

export async function GET(request: Request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user: any = verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const upcoming = searchParams.get('upcoming') === 'true';

        let query: any = {};

        // Filter out cancelled meetings by default (unless explicitly requested)
        if (status !== 'cancelled' && !status) {
            query.status = { $ne: 'cancelled' };
        }

        // Filter by user role
        if (user.role === 'employee') {
            try {
                query.attendees = new mongoose.Types.ObjectId(user.id);
            } catch (error) {
                // If user.id is not a valid ObjectId, skip the filter
                console.error('Invalid user ID format:', user.id);
            }
        }

        // Filter by status
        if (status && status !== 'all') {
            if (status === 'cancelled') {
                // If explicitly requesting cancelled meetings, remove the default filter
                delete query.status;
                query.status = 'cancelled';
            } else {
                query.status = status;
            }
        }

        // Filter upcoming meetings
        if (upcoming) {
            query.startTime = { $gte: new Date() };
            query.status = { $in: ['scheduled', 'ongoing'] };
        }

        const meetings = await Meeting.find(query)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .sort({ startTime: 1 })
            .lean();

        return NextResponse.json({ meetings });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user: any = verifyToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { title, description, agenda, meetingLink, startTime, endTime, attendees, location, isRecurring, recurrence } = body;

        // Validation
        if (!title || !startTime || !endTime) {
            return NextResponse.json({ error: 'Title, start time, and end time are required' }, { status: 400 });
        }

        if (new Date(startTime) >= new Date(endTime)) {
            return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
        }

        const meeting = await Meeting.create({
            title,
            description,
            agenda: agenda || [],
            meetingLink,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            organizer: new mongoose.Types.ObjectId(user.id),
            attendees: attendees || [],
            location,
            isRecurring: isRecurring || false,
            recurrence,
            status: 'scheduled',
        });


        const populatedMeeting = await Meeting.findById(meeting._id)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email');

        return NextResponse.json({ meeting: populatedMeeting }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating meeting:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
