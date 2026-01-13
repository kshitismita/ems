'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { getLocalStorage } from '@/lib/storage';
import { Calendar, User, AlignLeft, Flag, AlertCircle, Loader2 } from 'lucide-react';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated?: () => void;
    editingTask?: any | null;
}

interface Employee {
    _id: string;
    name: string;
    email: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onTaskCreated, editingTask }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: '',
        deadline: '',
        priority: 'medium',
    });

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            // Populate form if editing, otherwise reset
            if (editingTask) {
                setFormData({
                    title: editingTask.title || '',
                    description: editingTask.description || '',
                    assignedTo: editingTask.assignedTo?._id || '',
                    deadline: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '',
                    priority: editingTask.priority || 'medium',
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    assignedTo: '',
                    deadline: '',
                    priority: 'medium',
                });
            }
            setError('');
        }
    }, [isOpen, editingTask]);

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const token = getLocalStorage('token');
            const response = await fetch('/api/employees?role=employee&isActive=true&limit=100', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees || []);
            }
        } catch (err) {
            console.error('Failed to fetch employees', err);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!formData.title || !formData.assignedTo || !formData.deadline) {
            setError('Please fill in all required fields');
            setSubmitting(false);
            return;
        }

        try {
            const token = getLocalStorage('token');
            const url = editingTask ? `/api/tasks/${editingTask._id}` : '/api/tasks';
            const method = editingTask ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(editingTask ? 'Failed to update task' : 'Failed to create task');
            }

            const data = await response.json();
            if (onTaskCreated) onTaskCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? "Edit Task" : "Create New Task"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Task Title</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 pl-10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="e.g. Update Homepage Design"
                            required
                        />
                        <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                        placeholder="Detailed description of the task..."
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Assign To</label>
                        <div className="relative">
                            <select
                                value={formData.assignedTo}
                                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                                required
                            >
                                <option value="" disabled className="bg-slate-900">Select Employee</option>
                                {loadingEmployees ? (
                                    <option disabled className="bg-slate-900">Loading...</option>
                                ) : (
                                    employees.map((emp) => (
                                        <option key={emp._id} value={emp._id} className="bg-slate-900">
                                            {emp.name}
                                        </option>
                                    ))
                                )}
                            </select>
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Deadline</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 pl-10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                                required
                            />
                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['low', 'medium', 'high'].map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: p })}
                                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 capitalize ${formData.priority === p
                                    ? p === 'high' ? 'bg-red-500/20 border-red-500 text-red-500'
                                        : p === 'medium' ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                            : 'bg-green-500/20 border-green-500 text-green-500'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <Flag className="w-3 h-3" />
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
