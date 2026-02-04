'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface User {
  username: string;
  password: string;
  role: string;
  permissions: string[];
  created_at: string;
  last_login: string;
  last_duration: string;
}

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: {
      closing: true,
      po_sheet: false,
      accessories: false,
      sewing_closing_report: false,
      daily_line_wise_input_report: false,
      challan_wise_input_report: false,
    },
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      permissions: {
        closing: true,
        po_sheet: false,
        accessories: false,
        sewing_closing_report: false,
        daily_line_wise_input_report: false,
        challan_wise_input_report: false,
      },
    });
    setMessage(null);
  };

  const openModal = (type: ModalType, user?: User, usernameKey?: string) => {
    if (user) {
      const userWithUsername = { ...user, username: user.username || usernameKey || '' };
      setSelectedUser(userWithUsername);
      setFormData({
        username: userWithUsername.username,
        password: user.password,
        permissions: {
          closing: user.permissions?.includes('closing') ?? false,
          po_sheet: user.permissions?.includes('po_sheet') ?? false,
          accessories: user.permissions?.includes('accessories') ?? false,
          sewing_closing_report: user.permissions?.includes('sewing_closing_report') ?? false,
          daily_line_wise_input_report: user.permissions?.includes('daily_line_wise_input_report') ?? false,
          challan_wise_input_report: user.permissions?.includes('challan_wise_input_report') ?? false,
        },
      });
    } else {
      resetForm();
      setSelectedUser(null);
    }
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const permissions: string[] = [];
    if (formData.permissions.closing) permissions.push('closing');
    if (formData.permissions.po_sheet) permissions.push('po_sheet');
    if (formData.permissions.accessories) permissions.push('accessories');
    if (formData.permissions.sewing_closing_report) permissions.push('sewing_closing_report');
    if (formData.permissions.daily_line_wise_input_report) permissions.push('daily_line_wise_input_report');
    if (formData.permissions.challan_wise_input_report) permissions.push('challan_wise_input_report');

    try {
      const isEdit = modalType === 'edit';
      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          permissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', isEdit ? 'User updated successfully' : 'User created successfully');
        fetchUsers();
        setTimeout(() => closeModal(), 800);
      } else {
        showToast('error', data.message || 'Operation failed');
        setMessage({ type: 'error', text: data.message || 'Operation failed' });
      }
    } catch {
      showToast('error', 'Connection error');
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser.username }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'User deleted successfully');
        fetchUsers();
        closeModal();
      } else {
        showToast('error', data.message || 'Failed to delete user');
        setMessage({ type: 'error', text: data.message || 'Failed to delete user' });
      }
    } catch {
      showToast('error', 'Connection error');
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = Object.entries(users).filter(([username]) =>
    username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = Object.keys(users).length;
  const adminCount = Object.values(users).filter(u => u.role === 'admin').length;
  const activeToday = Object.values(users).filter(u => u.last_login !== 'Never').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-3 border-slate-200 border-t-teal-500 rounded-full mx-auto mb-4"
          />
          <p className="text-sm text-slate-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200"
          >
            <UsersIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
            <p className="text-sm text-slate-500">Manage users, permissions and access control</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openModal('create')}
          className="h-11 px-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add User
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6"
      >
        {[
          { label: 'Total Users', value: totalUsers, icon: UsersIcon, gradient: 'from-teal-500 to-emerald-600', shadow: 'shadow-teal-200' },
          { label: 'Administrators', value: adminCount, icon: ShieldCheckIcon, gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-300' },
          { label: 'Active Users', value: activeToday, icon: CheckCircleIcon, gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-200' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
          />
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase py-4 px-6">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-5">Password</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-5">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-5">Permissions</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-5">Last Login</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(([username, user], index) => (
                <motion.tr
                  key={username}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{username}</p>
                        <p className="text-xs text-slate-500">Created {user.created_at}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                        {showPassword[username] ? user.password : '••••••••'}
                      </code>
                      <button
                        onClick={() => setShowPassword(prev => ({ ...prev, [username]: !prev[username] }))}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                      >
                        {showPassword[username] ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded ${
                      user.role === 'admin' 
                        ? 'bg-slate-700 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions?.length > 0 ? (
                        user.permissions.map((perm) => (
                          <span 
                            key={perm} 
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-teal-50 text-teal-600"
                          >
                            {perm.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No permissions</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-sm text-slate-500">{user.last_login}</span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openModal('view', user, username)}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => openModal('edit', user, username)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal('delete', user, username)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-medium">No users found</p>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            {/* Create/Edit Modal */}
            {(modalType === 'create' || modalType === 'edit') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">
                    {modalType === 'create' ? 'Create New User' : 'Edit User'}
                  </h2>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                      message.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={modalType === 'edit'}
                        className="w-full h-11 px-4 text-sm bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-11 px-4 text-sm bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono transition-all"
                        required
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Password is stored and visible to admins</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                      <div className="space-y-2">
                        {[
                          { key: 'closing', label: 'Closing Report' },
                          { key: 'po_sheet', label: 'PO Sheet' },
                          { key: 'accessories', label: 'Accessories' },
                          { key: 'sewing_closing_report', label: 'Sewing Closing Report' },
                          { key: 'daily_line_wise_input_report', label: 'Daily Line Wise Input Report' },
                          { key: 'challan_wise_input_report', label: 'Challan Wise Input Report' },
                        ].map(({ key, label }) => (
                          <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            formData.permissions[key as keyof typeof formData.permissions]
                              ? 'bg-teal-50 border-2 border-teal-200'
                              : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.permissions[key as keyof typeof formData.permissions]}
                              onChange={(e) => setFormData({
                                ...formData,
                                permissions: { ...formData.permissions, [key]: e.target.checked }
                              })}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm font-medium text-slate-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-11 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : (modalType === 'create' ? 'Create User' : 'Save Changes')}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 h-11 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* View Modal */}
            {modalType === 'view' && selectedUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">User Details</h2>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{selectedUser.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{selectedUser.username}</h3>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded mt-1 ${
                        selectedUser.role === 'admin' 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedUser.role === 'admin' ? 'Administrator' : 'User'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Password</label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="text-sm font-mono text-slate-800 bg-slate-100 px-3 py-2 rounded-lg">
                          {showPassword['modal'] ? selectedUser.password : '••••••••'}
                        </code>
                        <button
                          onClick={() => setShowPassword(prev => ({ ...prev, modal: !prev['modal'] }))}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUser.password);
                            showToast('success', 'Password copied!');
                          }}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Permissions</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedUser.permissions?.length > 0 ? (
                          selectedUser.permissions.map((perm) => (
                            <span key={perm} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-600">
                              {perm.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No permissions</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <label className="text-xs font-medium text-slate-500 uppercase">Created</label>
                        <p className="mt-1 text-sm font-medium text-slate-800">{selectedUser.created_at}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <label className="text-xs font-medium text-slate-500 uppercase">Last Login</label>
                        <p className="mt-1 text-sm font-medium text-slate-800">{selectedUser.last_login}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    {selectedUser.role !== 'admin' && (
                      <button
                        onClick={() => { setModalType('edit'); setShowPassword({}); }}
                        className="flex-1 h-11 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors"
                      >
                        Edit User
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="flex-1 h-11 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Delete Modal */}
            {modalType === 'delete' && selectedUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-xl w-full max-w-sm shadow-2xl"
              >
                <div className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Delete User</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Are you sure you want to delete <span className="font-semibold">{selectedUser.username}</span>? This cannot be undone.
                  </p>
                  
                  {message && (
                    <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                      {message.text}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 h-11 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
                toast.type === 'success' ? 'bg-teal-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {toast.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 p-1 hover:bg-white/20 rounded">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
