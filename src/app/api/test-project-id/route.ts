import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    const projectId = '696519b50f3629dbe3e508d8';
    
    console.log('Test API - Checking project ID:', projectId);
    console.log('Test API - ObjectId valid:', mongoose.Types.ObjectId.isValid(projectId));
    
    // Test if the specific project exists
    const project = await Project.findById(projectId);
    
    return NextResponse.json({
      status: 'ok',
      projectId: projectId,
      objectIdValid: mongoose.Types.ObjectId.isValid(projectId),
      projectExists: !!project,
      project: project ? {
        _id: project._id,
        name: project.name,
        status: project.status
      } : null,
      message: 'Project existence test',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
