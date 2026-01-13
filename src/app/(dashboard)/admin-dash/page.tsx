'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card } from '@/components/ui/Card';
import { TaskModal } from '@/components/dashboard/TaskModal';
import TasksSidebar from '@/components/dashboard/TasksSidebar';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import DashboardLayout from '@/components/dashboard/Layout';
import AuthGuard from '@/components/auth/AuthGuard';

import {
    Users,
    Shield,
    Briefcase,
    FileText,
    Video,
    Plus,
    UserPlus,
    Clock,
    TrendingUp,
    Library
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    AreaChart,
    XAxis,
    YAxis,
    Area,
    Legend,
    BarChart,
    Bar,
    CartesianGrid
} from 'recharts';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'employee';
}

interface DashboardStats {
    employees?: { total: number; active: number; inactive?: number };
    projects?: { total: number; active: number };
    reports?: { total: number; pending: number };
    documents?: number;
    meetings?: { total: number; upcoming: number };
    library?: { total: number; new: number };
}


interface AnalyticsData {
    workforceDistribution: Array<{
        name: string;
        value: number;
    }>;
    reportTrends: Array<{
        date: string;
        count: number;
    }>;
    projectStatus: Array<{
        name: string;
        value: number;
        projects: Array<{ name: string; progress: number }>;
    }>;
    projectProgress: Array<{
        name: string;
        status: 'active' | 'planning' | 'completed';
        progress: number;
    }>;
    deadlineAnalytics: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    statusTimeline: Array<{
        date: string;
        total: number;
        planning: number;
        active: number;
        'on-hold': number;
        completed: number;
        cancelled: number;
    }>;
}

// Enterprise-grade chart configurations
const CHART_CONFIG = {
    animation: {
        duration: 900,
        easing: 'ease-out' as const,
        begin: 0
    },
    colors: {
        primary: '#0088FE',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        muted: '#6B7280'
    },
    gradients: {
        primary: {
            start: { offset: '0%', stopColor: '#0088FE', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#0088FE', stopOpacity: 0.1 }
        },
        success: {
            start: { offset: '0%', stopColor: '#10B981', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#10B981', stopOpacity: 0.1 }
        },
        warning: {
            start: { offset: '0%', stopColor: '#F59E0B', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#F59E0B', stopOpacity: 0.1 }
        },
        danger: {
            start: { offset: '0%', stopColor: '#EF4444', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#EF4444', stopOpacity: 0.1 }
        },
        info: {
            start: { offset: '0%', stopColor: '#3B82F6', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#3B82F6', stopOpacity: 0.1 }
        },
        muted: {
            start: { offset: '0%', stopColor: '#6B7280', stopOpacity: 0.8 },
            end: { offset: '95%', stopColor: '#6B7280', stopOpacity: 0.1 }
        }
    }
};

const WORKFORCE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Custom tooltip components for enterprise-grade design
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const value = data.value;
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-white font-semibold text-sm mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-gray-400 text-xs mt-1">
                        {percentage > 0 && `${percentage}% of total`}
                        {data.projects && (
                            <span className="block mt-2 text-gray-500">
                                {data.projects.slice(0, 2).map((project: string, i: number) => (
                                    <span key={i} className="text-gray-300">• {project}</span>
                                ))}
                                {data.projects.length > 2 && (
                                    <span className="text-gray-400 italic">+{data.projects.length - 2} more</span>
                                )}
                            </span>
                        )}
                    </p>
                </div>
                {percentage > 0 && (
                    <div className="flex items-center justify-center">
                        <div className="text-xs font-medium text-gray-400">
                            {percentage > 50 ? '↑' : percentage > 25 ? '↗' : '→'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChartHeader = ({ title, subtitle, icon, trend, color }: any) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}/10`}>
                {icon}
            </div>
            {trend && (
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{trend.label}</p>
                    <p className={`text-xs font-semibold ${trend.color}`}>{trend.value}</p>
                </div>
            )}
        </div>
    </div>
);

export default function AdminDash() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<DashboardStats>({});
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const fetchStats = async (token: string) => {
        try {
            const response = await fetch('/api/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Admin Dashboard - API Response:', data);
                setStats(data.stats || data);
            }
        } catch (error) {
            console.error('Admin Dashboard - Error fetching stats', error);
        }
    };


    const fetchAnalytics = async (token: string) => {
        try {
            console.log('Admin Dashboard - Fetching analytics with token:', token.substring(0, 20) + '...');
            const response = await fetch('/api/dashboard/analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Admin Dashboard - Analytics response status:', response.status);
            console.log('Admin Dashboard - Analytics response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const data = await response.json();
                console.log('Admin Dashboard - Analytics data received:', data);
                setAnalytics(data);
            } else {
                console.error('Admin Dashboard - Analytics API error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Admin Dashboard - Error response body:', errorText);
            }
        } catch (error) {
            console.error('Admin Dashboard - Error fetching analytics', error);
        }
    };


    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout API failed:', error);
        }
        removeLocalStorage('token');
        removeLocalStorage('user');
        router.replace('/login');
    };

    useEffect(() => {
        const token = getLocalStorage('token');
        const userRaw = getLocalStorage('user');

        if (token && userRaw) {
            try {
                const userData = JSON.parse(userRaw);
                setUser(userData);

                Promise.all([
                    fetchStats(token),
                    fetchAnalytics(token)
                ]).finally(() => {
                    setLoading(false);
                });
            } catch (error) {
                console.error('Admin Dashboard - Error parsing user data', error);
                setLoading(false);
            }
        } else {
            // AuthGuard handles redirect to /login
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <AuthGuard allowedRoles={['admin']}>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-white tracking-tight">Admin Control Center</h1>
                                <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
                            </div>
                            <div className="hidden md:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Status</p>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-xs font-semibold text-emerald-500">Operational</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <StatsCard
                            title="Total Employees"
                            value={stats.employees?.total || 0}
                            subValue={`${stats.employees?.active || 0} active, ${stats.employees?.inactive ?? 0} inactive`}
                            color="primary"
                            icon={<Users className="w-5 h-5" />}
                            trend="up"
                            trendValue="+2 this month"
                            onClick={() => router.push('/employees')}
                        />
                        <StatsCard
                            title="Active Projects"
                            value={stats.projects?.total || 0}
                            subValue={`${stats.projects?.active || 0} ongoing`}
                            color="blue"
                            icon={<Briefcase className="w-5 h-5" />}
                            trend="up"
                            trendValue="+2 new"
                            onClick={() => router.push('/projects')}
                        />
                        <StatsCard
                            title="Pending Reports"
                            value={stats.reports?.pending || 0}
                            subValue="Awaiting review"
                            color="orange"
                            icon={<FileText className="w-5 h-5" />}
                            trend="neutral"
                            onClick={() => router.push('/reports')}
                        />
                        <StatsCard
                            title="Total Meetings Scheduled"
                            value={stats.meetings?.total || 0}
                            subValue={`${stats.meetings?.upcoming || 0} upcoming`}
                            color="indigo"
                            icon={<Video className="w-5 h-5" />}
                            trend="up"
                            trendValue="+2 this week"
                            onClick={() => router.push('/meetings')}
                        />
                        <StatsCard
                            title="Total Library"
                            value={stats.library?.total || 0}
                            subValue={`${stats.library?.new || 0} New`}
                            color="emerald"
                            icon={<Library className="w-5 h-5" />}
                            trend="up"
                            trendValue="+3 new"
                            onClick={() => router.push('/reference-library')}
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h3>
                        </div>
                        <div className="p-4 text-white">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => router.push('/employees/create')}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all group border border-white/5"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary transition-all border border-white/5">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-300 group-hover:text-white">Add Employee</span>
                                </button>
                                <button
                                    onClick={() => setIsTaskModalOpen(true)}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all group border border-white/5"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-all border border-white/5">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-300 group-hover:text-white">Create Task</span>
                                </button>
                                <button
                                    onClick={() => router.push('/projects/create')}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group border border-white/5"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-all border border-white/5">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-300 group-hover:text-white">New Project</span>
                                </button>
                                <button
                                    onClick={() => router.push('/meetings/create')}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group border border-white/5"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-all border border-white/5">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-300 group-hover:text-white">Schedule Meeting</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Top Row Charts: Workforce & Productivity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Workforce Analytics */}
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workforce Analytics</h3>
                                    <p className="text-xs text-gray-500">User distribution (employees + admins)</p>
                                </div>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Users className="w-4 h-4 text-blue-500" />
                                </div>
                            </div>

                            <div className="h-[200px] w-full min-h-[200px]">
                                {analytics && analytics.workforceDistribution ? (
                                    <ResponsiveContainer width="100%" height={200} aspect={undefined}>
                                        <PieChart>
                                            <Pie
                                                data={analytics.workforceDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {analytics.workforceDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={WORKFORCE_COLORS[index % WORKFORCE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0];
                                                        return (
                                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/30 rounded-xl p-4 shadow-2xl min-w-[220px] backdrop-blur-sm">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                        backgroundColor: WORKFORCE_COLORS[analytics.workforceDistribution.findIndex((item: any) => item.name === data.payload.name) % WORKFORCE_COLORS.length]
                                                                    }}></div>
                                                                    <div>
                                                                        <p className="text-white font-bold text-base">{data.payload.name}</p>
                                                                        <p className="text-gray-500 text-xs uppercase tracking-wide">Workforce Category</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-400 text-xs uppercase tracking-wide">Count</span>
                                                                        <span className="text-white font-bold text-lg">{data.value}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-400 text-xs uppercase tracking-wide">Percentage</span>
                                                                        <span className="text-gray-200 font-semibold">
                                                                            {Math.round((data.value / analytics.workforceDistribution.reduce((sum: number, item: any) => sum + item.value, 0)) * 100)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                                contentStyle={{
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    borderRadius: 0,
                                                    transform: 'none',
                                                    transition: 'none'
                                                }}
                                                wrapperStyle={{
                                                    transform: 'none',
                                                    transition: 'none'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mb-3"></div>
                                        <div>Loading analytics...</div>
                                        <div className="text-xs text-gray-600 mt-1">Check console for details</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Productivity Trends */}
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Report Trends</h3>
                                    <p className="text-xs text-gray-500">7-day submission history</p>
                                </div>
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-purple-500" />
                                </div>
                            </div>
                            <div className="h-[200px] w-full min-h-[200px]">
                                {analytics && analytics.reportTrends ? (
                                    <ResponsiveContainer width="100%" height={200} aspect={undefined}>
                                        <AreaChart data={analytics.reportTrends}>
                                            <defs>
                                                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                stroke="#64748b"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#64748b"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                                width={20}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid #ffffff14',
                                                    borderRadius: '12px'
                                                }}
                                                itemStyle={{ color: '#e2e8f0' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorReports)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">Loading timeline...</div>
                                )}
                            </div>
                        </div>

                        {/* Project Status Distribution */}
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Status</h3>
                                    <p className="text-xs text-gray-500">Current ecosystem health</p>
                                </div>
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Briefcase className="w-4 h-4 text-emerald-500" />
                                </div>
                            </div>

                            <div className="h-[200px] w-full min-h-[200px]">
                                {analytics && analytics.projectStatus ? (
                                    <ResponsiveContainer width="100%" height={200} aspect={undefined}>
                                        <PieChart>
                                            <Pie
                                                data={analytics.projectStatus}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                                animationBegin={0}
                                                animationDuration={1500}
                                                animationEasing="ease-in-out"
                                            >
                                                {analytics.projectStatus.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={PROJECT_COLORS[index % PROJECT_COLORS.length]}
                                                        className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/30 rounded-xl p-4 shadow-2xl min-w-[280px] backdrop-blur-sm">
                                                                {data.projects && data.projects.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <div className="w-3 h-3 rounded-full" style={{
                                                                                backgroundColor: analytics?.projectStatus
                                                                                    ? PROJECT_COLORS[analytics.projectStatus.findIndex((item: any) => item.name === data.name) % PROJECT_COLORS.length]
                                                                                    : '#ccc'
                                                                            }}></div>
                                                                            <div>
                                                                                <p className="text-white font-bold text-base">{data.name}</p>
                                                                                <p className="text-gray-500 text-xs uppercase tracking-wide">Status Category</p>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50">Projects in this status</p>
                                                                        {data.projects.slice(0, 8).map((project: any, i: number) => (
                                                                            <div key={i} className="flex justify-between items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-white/5">
                                                                                <div className="flex-1">
                                                                                    <p className="text-gray-200 text-sm font-medium truncate">
                                                                                        {typeof project === 'string' ? project : project.name}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Project Name</p>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-primary font-bold text-sm">
                                                                                        {typeof project === 'string' ? 'N/A' : `${project.progress}%`}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Progress</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {data.projects.length > 8 && (
                                                                            <p className="text-gray-500 text-[10px] italic text-center mt-2 p-1">+{data.projects.length - 8} more projects</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center py-4">
                                                                        <p className="text-gray-400 text-sm">No projects in this status</p>
                                                                        <p className="text-gray-500 text-xs mt-1">Status: {data.name}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                                contentStyle={{
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    borderRadius: 0,
                                                    transform: 'none',
                                                    transition: 'none'
                                                }}
                                                wrapperStyle={{
                                                    transform: 'none',
                                                    transition: 'none'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">Loading status...</div>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Deadline Analytics */}
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden p-6">
                            <ChartHeader
                                title="Deadline Overview"
                                subtitle="Project-specific deadline analysis"
                                icon={<Clock className="w-4 h-4 text-red-500" />}
                                trend={(() => {
                                    const overdueCount = analytics?.deadlineAnalytics?.find((item: any) => item.name === 'Overdue')?.value || 0;
                                    const dueTodayCount = analytics?.deadlineAnalytics?.find((item: any) => item.name === 'Due Today')?.value || 0;
                                    const criticalCount = overdueCount + dueTodayCount;

                                    if (criticalCount > 0) {
                                        return {
                                            label: `${criticalCount} projects need immediate attention`,
                                            value: "⚠️ Critical",
                                            color: "text-red-500"
                                        };
                                    } else if (analytics?.deadlineAnalytics?.find((item: any) => item.name === 'Due Soon (3 days)')?.value > 0) {
                                        return {
                                            label: "Projects due soon",
                                            value: "⚡ Action Required",
                                            color: "text-yellow-500"
                                        };
                                    } else {
                                        return {
                                            label: "All projects on track",
                                            value: "✅ Good",
                                            color: "text-green-500"
                                        };
                                    }
                                })()}
                                color="red"
                            />
                            {/* Enhanced Deadline Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                                {analytics?.deadlineAnalytics?.slice(0, 6).map((item: any, index: number) => {
                                    const urgencyConfig = {
                                        'Overdue': { bg: 'bg-red-500/10 border-red-500/20 text-red-400', icon: '🚨' },
                                        'Due Today': { bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400', icon: '⏰' },
                                        'Due Soon (3 days)': { bg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', icon: '📅' },
                                        'Due This Week': { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', icon: '📆' },
                                        'Due This Month': { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', icon: '🗓️' },
                                        'No Deadline': { bg: 'bg-gray-500/10 border-gray-500/20 text-gray-400', icon: '📋' }
                                    };
                                    const config = urgencyConfig[item.name as keyof typeof urgencyConfig] || { bg: 'bg-gray-500/10 border-gray-500/20 text-gray-400', icon: '❓' };
                                    return (
                                        <div key={index} className={`p-4 rounded-xl border ${config.bg} hover:scale-105 transition-all duration-300 cursor-pointer`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">{config.icon}</span>
                                                <div className="text-xs font-medium uppercase tracking-wide">{item.name}</div>
                                            </div>
                                            <div className="text-2xl font-bold">{item.value}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <TaskModal
                        isOpen={isTaskModalOpen}
                        onClose={() => setIsTaskModalOpen(false)}
                        onTaskCreated={() => {
                            // Task created
                        }}
                    />
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
