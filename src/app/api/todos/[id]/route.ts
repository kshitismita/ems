import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
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
        console.error('[AUTH] Token verification failed:', error);
        return null;
    }
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ 
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        
        // Validate todo ID format
        if (!id || typeof id !== 'string' || id.length !== 24) {
            return NextResponse.json({ 
                error: 'Bad Request',
                message: 'Invalid todo ID format'
            }, { status: 400 });
        }
        
        const todo = await Todo.findOne({ _id: id, user: user.id });

        if (!todo) {
            return NextResponse.json({ 
                error: 'Not Found',
                message: 'Todo not found or you do not have permission to update it'
            }, { status: 404 });
        }

        const body = await req.json().catch(() => {
            throw new Error('Invalid JSON in request body');
        });

        if (typeof body.completed !== 'boolean') {
            return NextResponse.json({ 
                error: 'Bad Request',
                message: 'Completed field must be a boolean'
            }, { status: 400 });
        }

        todo.completed = body.completed;
        await todo.save();

        return NextResponse.json({ 
            todo,
            message: 'Todo updated successfully'
        });

    } catch (error) {
        console.error('[TODOS_PATCH] Error updating todo:', error);
        
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
            
            if (error.message.includes('Cast to ObjectId failed')) {
                return NextResponse.json({ 
                    error: 'Bad Request',
                    message: 'Invalid todo ID format'
                }, { status: 400 });
            }
        }
        
        return NextResponse.json({ 
            error: 'Internal Server Error',
            message: 'Failed to update todo. Please try again.'
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user: any = verifyToken(req);
        if (!user) {
            return NextResponse.json({ 
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        
        console.log(`[DELETE_TODO] User: ${user.id}, TodoID: ${id}`);
        
        // Validate todo ID format
        if (!id || typeof id !== 'string' || id.length !== 24) {
            return NextResponse.json({ 
                error: 'Bad Request',
                message: 'Invalid todo ID format'
            }, { status: 400 });
        }

        const deletedTodo = await Todo.findOneAndDelete({ _id: id, user: user.id });
        console.log(`[DELETE_TODO] Result:`, deletedTodo);

        if (!deletedTodo) {
            return NextResponse.json({ 
                error: 'Not Found',
                message: 'Todo not found or you do not have permission to delete it'
            }, { status: 404 });
        }

        return NextResponse.json({ 
            message: 'Todo deleted successfully',
            deletedId: id
        });

    } catch (error) {
        console.error('[TODOS_DELETE] Error deleting todo:', error);
        
        // Handle specific errors
        if (error instanceof Error) {
            if (error.message.includes('connection')) {
                return NextResponse.json({ 
                    error: 'Database Connection Error',
                    message: 'Unable to connect to database. Please try again later.'
                }, { status: 503 });
            }
            
            if (error.message.includes('Cast to ObjectId failed')) {
                return NextResponse.json({ 
                    error: 'Bad Request',
                    message: 'Invalid todo ID format'
                }, { status: 400 });
            }
        }
        
        return NextResponse.json({ 
            error: 'Internal Server Error',
            message: 'Failed to delete todo. Please try again.'
        }, { status: 500 });
    }
}
