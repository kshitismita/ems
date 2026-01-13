'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Calendar,
  TrendingUp,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

interface TasksSidebarProps {
  className?: string;
}

export default function TasksSidebar({ className }: TasksSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'review' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [filter, searchTerm]);

  const fetchTasks = async () => {
    try {
      const token = getLocalStorage('token');
      if (!token) return;

      setLoading(true);

      let url = '/api/tasks';
      const params = new URLSearchParams();

      if (filter !== 'all') {
        params.append('status', filter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = getLocalStorage('token');
      if (!token) return;

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchTasks(); // Refresh tasks
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = !searchTerm ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Tasks Management
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTasks}
            className="p-2"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{taskStats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{taskStats.review}</div>
            <div className="text-xs text-gray-600">Review</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex gap-1">
            {(['all', 'todo', 'in-progress', 'review', 'completed'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className="text-xs px-2 py-1"
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      <Card className="p-4 flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">All Tasks</h4>
          <span className="text-sm text-gray-500">{filteredTasks.length} tasks</span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task._id}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <h5 className="font-medium text-gray-900 text-sm">{task.title}</h5>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3 h-3" />
                      <span>{task.assignedTo.name}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(task.status))}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
                  </div>
                  {task.status !== 'completed' && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTaskStatus(task._id, 'in-progress')}
                        className="text-xs px-2 py-1"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateTaskStatus(task._id, 'completed')}
                        className="text-xs px-2 py-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No tasks found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
