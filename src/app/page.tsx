'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLocalStorage } from '@/lib/storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getLocalStorage('token');
    // Don't auto-redirect, let user choose to go to dashboard
    // if (token) {
    //   router.push('/dashboard');
    // }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Employee Management
            <span className="block text-indigo-600">System</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            A comprehensive solution for managing employees, projects, documents, and daily reports. 
            Built with Next.js and MongoDB Atlas for seamless team collaboration.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
            >
              Create Account <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-2xl sm:mt-24 lg:mt-32 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">1</span>
                </div>
                Role-Based Access
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Three-tier user roles (Admin, Manager, Employee) with granular permissions 
                  and secure authentication.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">2</span>
                </div>
                Document Management
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Secure file upload system with categories, tags, and access controls 
                  for efficient document sharing.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold">3</span>
                </div>
                Project Tracking
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Complete project management with deadlines, workflow stages, 
                  and team assignment capabilities.
                </p>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mx-auto mt-20 max-w-2xl sm:mt-24 lg:mt-32">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Key Features
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
                  <span className="text-green-600 text-xl">👥</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Employee Management</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Complete CRUD operations for employee records with role assignment.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                  <span className="text-blue-600 text-xl">📊</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Daily Reports</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Track daily progress, challenges, and achievements with mood monitoring.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-purple-100">
                  <span className="text-purple-600 text-xl">📈</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Dashboard Analytics</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Real-time statistics and insights for informed decision-making.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-yellow-600 text-xl">⏰</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Attendance Tracking</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor check-in/out times and calculate overtime automatically.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                  <span className="text-red-600 text-xl">📝</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Leave Management</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Handle leave requests with approval workflows and multiple leave types.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                  <span className="text-indigo-600 text-xl">🔐</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Secure Authentication</h3>
                <p className="mt-2 text-sm text-gray-600">
                  JWT-based authentication with role-based access control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
