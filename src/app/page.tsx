'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import { ArrowRight, Users, FileText, Shield, BarChart, Activity, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');
    
    if (userRaw) {
      try {
        const parsedUser = JSON.parse(userRaw);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data', error);
      }
    }
  }, []);

  const handleLogout = () => {
    removeLocalStorage('token');
    removeLocalStorage('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>
      
      <div className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-12 animate-fade-in-up">
            <img 
              src="/logo.png" 
              alt="SALAK Logo" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2306B6D4'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='0.3em' fill='white' font-family='Arial' font-size='40' font-weight='bold'%3ES%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          
          <h1 className="text-6xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl mb-4 animate-fade-in-up" style={{letterSpacing: '-0.02em'}}>
            SALAK
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-gray-300 animate-fade-in-up">
            Enterprise-grade employee management platform for modern teams. 
            Streamline workflows, boost productivity, and scale with confidence.
          </p>
          <div className="mt-12 flex items-center justify-center gap-x-6 animate-fade-in-up">
            <Link
              href="/login"
              className="group inline-flex items-center gap-3 px-10 py-4 bg-primary text-black font-bold text-lg rounded-2xl hover:bg-primary/90 transition-all duration-300 shadow-xl transform hover:scale-105"
            >
              Sign In
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-2xl transition-all duration-300 border border-white/20 backdrop-blur-sm transform hover:scale-105"
            >
              Create Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-4xl sm:mt-32 lg:mt-40 lg:max-w-none">
          <div className="text-center">
            <h2 className="text-5xl font-bold tracking-tight text-white mb-4">Why Choose SALAK?</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for scale, designed for teams, engineered for excellence.
            </p>
            <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-cyan-500 to-primary mb-6 shadow-xl shadow-primary/20">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Team Management</h3>
                <p className="mt-4 text-base text-gray-300 leading-relaxed">
                  Comprehensive employee profiles with role-based access control and seamless collaboration.
                </p>
              </div>
              <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-500 mb-6 shadow-xl shadow-emerald-500/20">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Smart Documents</h3>
                <p className="mt-4 text-base text-gray-300 leading-relaxed">
                  Intelligent document management with categorization, search, and secure sharing.
                </p>
              </div>
              <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-600 to-purple-500 mb-6 shadow-xl shadow-purple-500/20">
                  <BarChart className="w-10 h-10 text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Real-time Analytics</h3>
                <p className="mt-4 text-base text-gray-300 leading-relaxed">
                  Actionable insights and comprehensive reporting for data-driven decisions.
                </p>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
                  <Activity className="w-8 h-8 text-black" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">System Overview</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Complete project lifecycle management with team collaboration.
                </p>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-500 mb-4">
                  <Activity className="w-8 h-8 text-black" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">My Projects</h3>
                <p className="mt-2 text-sm text-gray-400">
                  View and manage all your assigned projects in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
