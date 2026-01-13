'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import { CheckCircle2, Circle, Clock, AlertCircle, User, Calendar, Filter, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    _id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    assignedBy: {
        name: string;
        email: string;
    };
    assignedTo: {
        name: string;
        email: string;
    };
    createdAt: string;
}

export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        const token = getLocalStorage('token');
        const userRaw = getLocalStorage('user');

        if (!token || !userRaw) {
            router.replace('/login');
            return;
        }

        try {
            setUser(JSON.parse(userRaw));
        } catch (e) {
            console.error('Error parsing user data:', e);
        }

        fetchTasks(token);
    }, [router]);

    const fetchTasks = async (token: string) => {
        try {
            const response = await fetch('/api/tasks', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setTasks(data.tasks || []);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            const token = getLocalStorage('token');
            if (!token) return;

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setTasks(tasks.filter(t => t._id !== taskId));
            } else {
                const errorData = await response.json();
                console.error('Error deleting task:', errorData.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const updateStatus = async (taskId: string, newStatus: string) => {
        setUpdatingId(taskId);
        try {
            const token = getLocalStorage('token');
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setTasks(tasks.map(t =>
                    t._id === taskId ? { ...t, status: newStatus as any } : t
                ));
            }
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-300 bg-red-400/20 border-red-400/30';
            case 'medium': return 'text-orange-300 bg-orange-400/20 border-orange-400/30';
            case 'low': return 'text-emerald-300 bg-emerald-400/20 border-emerald-400/30';
            default: return 'text-gray-300 bg-gray-400/20 border-gray-400/30';
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {user?.role === 'admin' ? 'Task Management' : 'My Tasks'}
                        </h1>
                        <p className="text-gray-300 mt-1">
                            {user?.role === 'admin' ? 'Create, assign, and monitor team tasks' : 'Manage and track your assigned work'}
                        </p>
                    </div>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            Create Task
                        </button>
                    )}
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    {['all', 'todo', 'in-progress', 'completed'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                filter === f
                                    ? "bg-primary text-white shadow-lg"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                <div className="grid gap-4">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map((task) => (
                            <Card key={task._id} className="p-6 transition-all hover:border-white/10 group">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <h3 className={cn(
                                                    "text-xl font-bold text-white group-hover:text-primary transition-colors",
                                                    task.status === 'completed' && "line-through text-gray-500"
                                                )}>
                                                    {task.title}
                                                </h3>
                                                <p className="text-gray-300 leading-relaxed text-sm">
                                                    {task.description}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                                getPriorityColor(task.priority)
                                            )}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <User className="w-5 h-5 text-purple-400" />
                                                <div className="flex flex-col">
                                                    <span>Assigned by <span className="text-gray-200">{task.assignedBy?.name || 'Admin'}</span></span>
                                                    {user?.role === 'admin' && (
                                                        <span className="text-xs">To: <span className="text-primary">{task.assignedTo?.name || 'Unassigned'}</span></span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-cyan-400" />
                                                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-orange-400" />
                                                <span>Posted {new Date(task.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-end justify-between gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                                        {user?.role === 'admin' ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setIsTaskModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border border-blue-500/20"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Are you sure you want to delete this task?')) {
                                                            try {
                                                                const token = getLocalStorage('token');
                                                                const response = await fetch(`/api/tasks/${task._id}`, {
                                                                    method: 'DELETE',
                                                                    headers: { Authorization: `Bearer ${token}` },
                                                                });
                                                                if (response.ok) {
                                                                    setTasks(tasks.filter(t => t._id !== task._id));
                                                                }
                                                            } catch (error) {
                                                                console.error('Error deleting task:', error);
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full">
                                                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Status</label>
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => updateStatus(task._id, e.target.value)}
                                                    disabled={updatingId === task._id}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="todo" className="bg-slate-900">To Do</option>
                                                    <option value="in-progress" className="bg-slate-900">In Progress</option>
                                                    <option value="completed" className="bg-slate-900">Completed</option>
                                                </select>
                                            </div>
                                        )}

                                        {task.status === 'completed' && (
                                            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Done
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 border border-white/10">
                                <Filter className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">No tasks found</h3>
                                <p className="text-sm text-gray-500">There are no tasks matching your filter.</p>
                            </div>
                        </div>
                    )}
                </div>

                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => {
                        setIsTaskModalOpen(false);
                        setEditingTask(null);
                    }}
                    editingTask={editingTask}
                    onTaskCreated={() => {
                        setIsTaskModalOpen(false);
                        setEditingTask(null);
                        const token = getLocalStorage('token');
                        if (token) fetchTasks(token);
                    }}
                />
            </div>
        </DashboardLayout >
    );
}
