import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';
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
        const type = searchParams.get('type');

        let query: any = {};

        // Filter by user role
        if (user.role === 'employee') {
            query.employee = new mongoose.Types.ObjectId(user.id);
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        const leaveRequests = await LeaveRequest.find(query)
            .populate('employee', 'name email employeeId')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ leaveRequests });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
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
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { type, startDate, endDate, reason, emergencyContact, attachments } = body;

        // Validation
        if (!type || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Type, start date, end date, and reason are required' }, { status: 400 });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
        }

        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const leaveRequest = await LeaveRequest.create({
            employee: new mongoose.Types.ObjectId(user.id),
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            days,
            reason,
            emergencyContact,
            attachments: attachments || [],
            status: 'pending'
        });

        const populatedLeaveRequest = await LeaveRequest.findById(leaveRequest._id)
            .populate('employee', 'name email employeeId');


        return NextResponse.json({ leaveRequest: populatedLeaveRequest }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating leave request:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
