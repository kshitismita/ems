'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Loader2, CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Todo {
    _id: string;
    text: string;
    completed: boolean;
}

export const TodoList = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        try {
            setError(null);
            const token = getLocalStorage('token');
            if (!token) {
                setError('Please log in to view your todos');
                return;
            }

            const response = await fetch('/api/todos', {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch todos (${response.status})`);
            }
            
            const data = await response.json();
            setTodos(data.todos || []);
            setRetryCount(0);
        } catch (error) {
            console.error('Error fetching todos:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load todos';
            setError(errorMessage);
            
            // Auto-retry for network errors (max 3 attempts)
            if (retryCount < 3 && errorMessage.includes('fetch')) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    fetchTodos();
                }, 2000 * (retryCount + 1));
            }
        } finally {
            setLoading(false);
        }
    };

    const addTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;

        setAdding(true);
        setError(null);
        try {
            const token = getLocalStorage('token');
            if (!token) {
                setError('Please log in to add todos');
                return;
            }
            
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: newTodo }),
            });

            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add todo (${response.status})`);
            }
            
            const data = await response.json();
            setTodos([data.todo, ...todos]);
            setNewTodo('');
        } catch (error) {
            console.error('Error adding todo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to add todo';
            setError(errorMessage);
        } finally {
            setAdding(false);
        }
    };

    const toggleTodo = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTodos(todos.map(t => t._id === id ? { ...t, completed: !currentStatus } : t));
        setError(null);

        try {
            const token = getLocalStorage('token');
            if (!token) {
                setError('Please log in to update todos');
                // Revert on error
                setTodos(todos.map(t => t._id === id ? { ...t, completed: currentStatus } : t));
                return;
            }
            
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ completed: !currentStatus }),
            });
            
            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                setTodos(todos.map(t => t._id === id ? { ...t, completed: currentStatus } : t));
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update todo (${response.status})`);
            }
        } catch (error) {
            console.error('Error toggling todo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update todo';
            setError(errorMessage);
            // Revert on error
            setTodos(todos.map(t => t._id === id ? { ...t, completed: currentStatus } : t));
        }
    };

    const deleteTodo = async (id: string) => {
        const previousTodos = [...todos];
        setTodos(todos.filter(t => t._id !== id));
        setError(null);

        try {
            const token = getLocalStorage('token');
            if (!token) {
                setError('Please log in to delete todos');
                setTodos(previousTodos);
                return;
            }
            
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                setTodos(previousTodos);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to delete todo (${response.status})`);
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete todo';
            setError(errorMessage);
            setTodos(previousTodos);
        }
    };

    return (
        <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                My To-Do List
            </h3>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={addTodo} className="mb-4 relative">
                <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Add a quick task..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-gray-500"
                />
                <button
                    type="submit"
                    disabled={adding || !newTodo.trim()}
                    className="absolute right-2 top-1.5 p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                >
                    {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[300px]">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                ) : todos.length > 0 ? (
                    todos.map((todo) => (
                        <div
                            key={todo._id}
                            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <button
                                onClick={() => toggleTodo(todo._id, todo.completed)}
                                className={cn(
                                    "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    todo.completed
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-gray-400 text-transparent hover:border-primary"
                                )}
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <span className={cn(
                                "flex-1 text-sm transition-all truncate",
                                todo.completed ? "text-gray-500 line-through" : "text-gray-100"
                            )}>
                                {todo.text}
                            </span>
                            <button
                                onClick={() => deleteTodo(todo._id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 text-xs">
                        {error ? (
                            <div className="flex flex-col items-center gap-2">
                                <span>Failed to load todos</span>
                                <button
                                    onClick={() => {
                                        setRetryCount(0);
                                        fetchTodos();
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors text-primary"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Retry
                                </button>
                            </div>
                        ) : (
                            'No tasks yet. Add one above!'
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};
