import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
import { verifyToken, AuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let user: AuthUser;

        try {
            user = verifyToken(token);
        } catch (error) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        await connectDB();

        const todos = await Todo.find({ user: user.id })
            .sort({ createdAt: -1 })
            .lean(); // Use lean for better performance

        return NextResponse.json({
            todos,
            count: todos.length
        });
    } catch (error) {
        console.error('[TODOS_GET] Error fetching todos:', error);

        // Handle specific database errors
        if (error instanceof Error) {
            if (error.message.includes('connection')) {
                return NextResponse.json({
                    error: 'Database Connection Error',
                    message: 'Unable to connect to database. Please try again later.'
                }, { status: 503 });
            }
        }

        return NextResponse.json({
            error: 'Internal Server Error',
            message: 'Failed to fetch todos. Please try again.'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Authentication required'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let user: AuthUser;

        try {
            user = verifyToken(token);
        } catch (error) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        await connectDB();

        const body = await req.json().catch(() => {
            throw new Error('Invalid JSON in request body');
        });

        const { text } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({
                error: 'Bad Request',
                message: 'Text is required and must be a string'
            }, { status: 400 });
        }

        if (text.trim().length === 0) {
            return NextResponse.json({
                error: 'Bad Request',
                message: 'Todo text cannot be empty'
            }, { status: 400 });
        }

        if (text.length > 500) {
            return NextResponse.json({
                error: 'Bad Request',
                message: 'Todo text must be less than 500 characters'
            }, { status: 400 });
        }

        const newTodo = await Todo.create({
            user: user.id,
            text: text.trim(),
            completed: false
        });

        return NextResponse.json({
            todo: newTodo,
            message: 'Todo created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('[TODOS_POST] Error creating todo:', error);

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('Invalid JSON')) {
                return NextResponse.json({
                    error: 'Bad Request',
                    message: 'Invalid request format'
                }, { status: 400 });
            }

            if (error.message.includes('connection')) {
                return NextResponse.json({
                    error: 'Database Connection Error',
                    message: 'Unable to connect to database. Please try again later.'
                }, { status: 503 });
            }

            if (error.message.includes('validation')) {
                return NextResponse.json({
                    error: 'Validation Error',
                    message: 'Invalid todo data provided'
                }, { status: 400 });
            }
        }

        return NextResponse.json({
            error: 'Internal Server Error',
            message: 'Failed to create todo. Please try again.'
        }, { status: 500 });
    }
}
