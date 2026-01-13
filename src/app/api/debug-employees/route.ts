import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        console.log('🔍 Debug: Testing employees endpoint...');
        
        // Test connection
        await connectDB();
        
        // Get all users
        const allUsers = await User.find({}).select('name email role');
        
        // Get employees only
        const employees = await User.find({ role: 'employee' }).select('name email role');
        
        // Get admins only
        const admins = await User.find({ role: 'admin' }).select('name email role');
        
        return NextResponse.json({
            status: 'success',
            counts: {
                total: allUsers.length,
                employees: employees.length,
                admins: admins.length
            },
            employees: employees,
            admins: admins,
            allUsers: allUsers
        });
        
    } catch (error: any) {
        console.error('❌ Debug employees error:', error);
        return NextResponse.json({
            status: 'error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
