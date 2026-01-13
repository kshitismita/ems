import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
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

        const { searchParams } = new URL(req.url);
        const assignedTo = searchParams.get('assignedTo');

        let query: any = {};

        // If assignedTo is provided, filter by it
        if (assignedTo) {
            query.assignedTo = assignedTo;
        } else if (user.role === 'employee') {
            // Employees can only see their own tasks if no specific filter (default behavior)
            query.assignedTo = user.id;
        }

        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user: any = verifyToken(req);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Only admins can create tasks.' }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { title, description, assignedTo, deadline, priority } = body;

        if (!title || !description || !assignedTo || !deadline) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate assignedTo user exists and is an employee
        const employee = await User.findById(assignedTo);
        if (!employee) {
            return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
        }

        const newTask = await Task.create({
            title,
            description,
            assignedTo,
            assignedBy: user.id,
            dueDate: new Date(deadline), // Mapping deadline to dueDate as per model
            priority: priority || 'medium',
            status: 'todo', // Default status
        });

        return NextResponse.json({ task: newTask }, { status: 201 });

    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
