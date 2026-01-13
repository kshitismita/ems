import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        console.log('🔍 Debug: Testing MongoDB connection...');
        
        // Test basic connection
        await connectDB();
        
        // Test database state
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        // Test specific collections
        const projectCount = await db.collection('projects').countDocuments();
        const userCount = await db.collection('users').countDocuments();
        
        return NextResponse.json({
            status: 'success',
            mongodb: {
                connected: mongoose.connection.readyState === 1,
                database: db.databaseName,
                collections: collections.map(c => c.name),
                counts: {
                    projects: projectCount,
                    users: userCount
                }
            }
        });
        
    } catch (error: any) {
        console.error('❌ Debug endpoint error:', error);
        return NextResponse.json({
            status: 'error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
