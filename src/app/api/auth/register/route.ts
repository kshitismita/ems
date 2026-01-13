import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, createAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  console.log('🔥 Registration endpoint called');

  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    console.log('📝 Parsing request body...');
    const { name, email, password, role = 'employee', department, position, employeeId } = await req.json();
    console.log('📊 Request data:', { name, email, role, hasPassword: !!password, hasEmployeeId: !!employeeId });

    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    if (employeeId) {
      console.log('🔍 Checking for existing employee ID...');
      const existingEmployeeId = await User.findOne({ employeeId });
      if (existingEmployeeId) {
        console.log('❌ Employee ID already exists:', employeeId);
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
    }

    console.log('👤 Creating user data object...');
    const userData: any = {
      name,
      email,
      password,
      role,
      department,
      position,
    };

    if (employeeId) {
      userData.employeeId = employeeId;
    } else if (role === 'employee') {
      console.log('🔢 Generating employee ID...');
      const lastEmployee = await User.findOne({ role: 'employee' }).sort({ employeeId: -1 });
      const lastNumber = lastEmployee?.employeeId ? parseInt(lastEmployee.employeeId.replace('EMP', '')) : 0;
      userData.employeeId = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
      console.log('🆔 Generated employee ID:', userData.employeeId);
    }

    console.log('💾 Creating new user...');
    const user = new User(userData);
    await user.save();
    console.log('✅ User saved successfully to MongoDB');

    console.log('🔐 Creating auth user and token...');
    const authUser = createAuthUser(user);
    const token = generateToken(authUser);
    console.log('✅ Auth user and token created');

    console.log('🎉 Registration complete!');
    return NextResponse.json({
      message: 'User registered successfully',
      user: authUser,
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('💥 Registration error details:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
