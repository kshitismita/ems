'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Briefcase,
    Calendar,
    CheckCircle,
    Clock,
    AlertTriangle,
    ChevronRight,
    Activity as ActivityIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Activity {
    id: string;
    type: 'project' | 'meeting' | 'attendance' | 'task' | 'deadline';
    title: string;
    description: string;
    timestamp: Date;
    metadata?: any;
}

interface RecentActivityProps {
    token: string;
}

export function RecentActivity({ token }: RecentActivityProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchActivities();
    }, [token]);

    const fetchActivities = async () => {
        try {
            const response = await fetch('/api/dashboard/activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setActivities(data.activities || []);
            } else {
                setError('Failed to load activities');
            }
        } catch (err) {
            setError('An error occurred while loading activities');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'project':
                return <Briefcase className="w-5 h-5" />;
            case 'meeting':
                return <Calendar className="w-5 h-5" />;
            case 'task':
                return <CheckCircle className="w-5 h-5" />;
            case 'attendance':
                return <Clock className="w-5 h-5" />;
            case 'deadline':
                return <AlertTriangle className="w-5 h-5" />;
            default:
                return <ActivityIcon className="w-5 h-5" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'project':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'meeting':
                return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'task':
                return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'attendance':
                return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            case 'deadline':
                return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default:
                return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getRelativeTime = (timestamp: Date) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleActivityClick = (activity: Activity) => {
        // Navigate based on activity type
        switch (activity.type) {
            case 'project':
            case 'deadline':
                if (activity.metadata?.projectId) {
                    router.push(`/projects/${activity.metadata.projectId}`);
                }
                break;
            case 'meeting':
                router.push('/meetings');
                break;
            case 'task':
                router.push('/tasks');
                break;
            case 'attendance':
                router.push('/attendance');
                break;
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6">
                <p className="text-red-400 text-sm">{error}</p>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <ActivityIcon className="w-5 h-5 text-primary" />
            </div>

            {activities.length === 0 ? (
                <div className="text-center py-8">
                    <ActivityIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No recent activities</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            onClick={() => handleActivityClick(activity)}
                            className="group flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer"
                        >
                            <div className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-colors",
                                getActivityColor(activity.type)
                            )}>
                                {getActivityIcon(activity.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {activity.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {getRelativeTime(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
