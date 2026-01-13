import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET(req: NextRequest) {
    try {
        console.log('🔍 Debug: Testing projects endpoint without auth...');
        
        // Test connection
        await connectDB();
        
        // Simple query
        const projects = await Project.find({}).limit(5);
        
        return NextResponse.json({
            status: 'success',
            count: projects.length,
            projects: projects.map(p => ({
                id: p._id,
                name: p.name,
                status: p.status
            }))
        });
        
    } catch (error: any) {
        console.error('❌ Debug projects error:', error);
        return NextResponse.json({
            status: 'error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
