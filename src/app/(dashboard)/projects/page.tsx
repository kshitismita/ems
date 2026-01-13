'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, ArrowUpDown, FolderKanban, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getLocalStorage } from '@/lib/storage';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate?: string;
  deadline?: string;
  progress: number;
  admin: {
    _id: string;
    name: string;
    email: string;
  };
  assignedEmployees: Array<{
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  tags?: string[];
  referenceUrls?: string[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'deadline' | 'progress'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
  });
  const router = useRouter();

  // Calculate deadline in days (similar to create page)
  const calculateDeadline = (deadline: string) => {
    if (!deadline) return 'N/A';

    const end = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
    end.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `${diffDays} days remaining`;
    }
  };

  useEffect(() => {
    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');

    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      setUser(parsedUser);

      // Only allow authenticated users to access projects
      if (!parsedUser) {
        console.log('Projects Page - No user found, redirecting to login');
        router.replace('/login');
        return;
      }

      fetchProjects(token);
    } catch (error) {
      console.error('Error parsing user data', error);
      setLoading(false);
    }
  }, [router]);

  const fetchProjects = async (token: string, currentStatus?: string, currentPriority?: string) => {
    try {
      let url = '/api/projects?limit=100';

      // Use provided filters or current state
      const targetStatus = currentStatus !== undefined ? currentStatus : statusFilter;
      const targetPriority = currentPriority !== undefined ? currentPriority : priorityFilter;

      // Add search parameter
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      // Add filter parameters
      if (targetStatus !== 'all') {
        url += `&status=${targetStatus}`;
      }
      if (targetPriority !== 'all') {
        url += `&priority=${targetPriority}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setError('Failed to fetch projects');
      }
    } catch (error) {
      setError('An error occurred while fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    const token = getLocalStorage('token');
    if (!token) return;

    setDeleteLoading(projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProjects(projects.filter(p => p._id !== projectId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete project');
      }
    } catch (error) {
      setError('An error occurred while deleting project');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSort = (field: 'name' | 'deadline' | 'progress') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = () => {
    const token = getLocalStorage('token');
    if (token) {
      setLoading(true);
      fetchProjects(token);
    }
  };

  // Apply sorting
  const sortedProjects = [...projects].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'deadline') {
      aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
      bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
    }

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calculate team size for currently displayed projects
  const teamSizeInView = new Set(projects.flatMap(p => p.assignedEmployees.map(e => e._id))).size;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {user?.role === 'admin' ? 'Projects' : 'My Projects'}
            </h1>
            <p className="text-gray-400 mt-1">
              {user?.role === 'admin' ? 'Manage projects and track progress' : 'View your assigned projects'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => router.push('/projects/create')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
            >
              <Plus className="w-5 h-5 font-bold" />
              New Project
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Projects"
            value={stats.total}
            icon={<FolderKanban className="w-6 h-6" />}
            color="primary"
          />
          <StatsCard
            title="Active Projects"
            value={stats.active}
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="emerald"
          />
          <StatsCard
            title="Team Members"
            value={teamSizeInView}
            icon={<Briefcase className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
            {['all', 'planning', 'active', 'on-hold', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  const token = getLocalStorage('token');
                  if (token) {
                    setLoading(true);
                    fetchProjects(token, status);
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                  statusFilter === status
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
            {['all', 'low', 'medium', 'high', 'critical'].map((priority) => (
              <button
                key={priority}
                onClick={() => {
                  setPriorityFilter(priority);
                  const token = getLocalStorage('token');
                  if (token) {
                    setLoading(true);
                    fetchProjects(token, undefined, priority);
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                  priorityFilter === priority
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {priority}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="Search by name, description, tags, or assigned employees..."
            />
            <button
              onClick={handleSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Projects Table */}
        <Card className="overflow-hidden border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 font-semibold text-white">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      Project Name
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold text-white">Status</th>
                  <th className="text-left p-4 font-semibold text-white">Priority</th>
                  <th className="text-left p-4 font-semibold text-white">
                    <button
                      onClick={() => handleSort('progress')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      Progress
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold text-white">Admin</th>
                  <th className="text-left p-4 font-semibold text-white">Team Size</th>
                  <th className="text-left p-4 font-semibold text-white">
                    <button
                      onClick={() => handleSort('deadline')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      Deadline
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr key={project._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div>
                        <button
                          onClick={() => router.push(`/projects/${project._id}`)}
                          className="font-medium text-white hover:text-primary transition-colors text-left"
                        >
                          {project.name}
                        </button>
                        <div className="text-xs text-gray-500 line-clamp-1">{project.description}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        project.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          project.status === 'planning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              project.status === 'on-hold' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>
                        {project.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        project.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          project.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            project.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              'bg-green-500/10 text-green-400 border-green-500/20'
                      )}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-white/10 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-300">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{project.admin?.name || 'Unassigned'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{project.assignedEmployees.length}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <span className={cn(
                          "font-medium",
                          project.deadline && calculateDeadline(project.deadline).includes('Overdue') ? 'text-red-400' :
                            project.deadline && calculateDeadline(project.deadline).includes('Due today') ? 'text-orange-400' :
                              project.deadline ? 'text-green-400' : 'text-gray-400'
                        )}>
                          {project.deadline ? calculateDeadline(project.deadline) : 'N/A'}
                        </span>
                        {project.deadline && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(project.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {user?.role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/projects/${project._id}?edit=true`)}
                            className="px-3 py-1 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-gray-300 rounded text-sm font-medium transition-all border border-white/5 hover:border-blue-500/30"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            disabled={deleteLoading === project._id}
                            className="px-3 py-1 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded text-sm font-medium transition-all border border-white/5 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading === project._id ? (
                              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/projects/${project._id}`)}
                          className="px-3 py-1 bg-white/5 hover:bg-primary/10 hover:text-primary text-gray-400 rounded text-sm font-medium transition-all border border-white/5"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedProjects.length === 0 && !loading && (
            <div className="py-16 text-center text-gray-500">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-400">No projects found.</p>
              <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
