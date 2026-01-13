import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    // Test basic database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Test if we can query projects
    const projectCount = await Project.countDocuments();
    
    return NextResponse.json({
      status: 'ok',
      database: dbStatus,
      projectCount: projectCount,
      message: 'Project API test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
