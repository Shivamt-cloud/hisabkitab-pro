import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, User, Package, ShoppingCart, TrendingUp, Users, BarChart3, Shield, CheckCircle, MessageCircle, Globe, X, Building2, Phone, MapPin, FileText, UserPlus } from 'lucide-react'
import { COUNTRY_OPTIONS, detectCountry, formatPrice, getCountryPricing, getSavedCountry, isSupportedCountryCode, saveCountry, type CountryPricing } from '../utils/pricing'
import { calculateTierPrice, getTierPricing } from '../utils/tierPricing'
import { getMaxUsersForPlan } from '../utils/planUserLimits'
import { SubscriptionTier } from '../types/device'
import { userService } from '../services/userService'
import { registrationRequestService } from '../services/registrationRequestService'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('IN')
  const [pricing, setPricing] = useState<CountryPricing>(getCountryPricing('IN'))
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [registrationMode, setRegistrationMode] = useState<'google' | 'direct'>('direct')
  const [isFreeTrialRegistration, setIsFreeTrialRegistration] = useState(false) // Track if registration is from free trial button
  const [googleUserEmail, setGoogleUserEmail] = useState('')
  const [googleUserName, setGoogleUserName] = useState('')
  const [registrationFormData, setRegistrationFormData] = useState({
    email: '',
    name: '',
    password: '',
    businessName: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    phone: '',
    gstin: '',
    website: '',
    description: '',
    subscription_tier: 'basic' as SubscriptionTier,
  })
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [subscriptionExpired, setSubscriptionExpired] = useState<{ daysExpired: number; currentTier: SubscriptionTier } | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Prefer saved country (user override), otherwise detect
    const saved = getSavedCountry()
    const initialCountry = isSupportedCountryCode(saved) ? (saved as string) : detectCountry()
    setSelectedCountry(initialCountry)
    setPricing(getCountryPricing(initialCountry))
  }, [])

  const applyCountrySelection = (country: string) => {
    setSelectedCountry(country)
    setPricing(getCountryPricing(country))
    saveCountry(country)
    // Default business country if empty (user can still change)
    setRegistrationFormData(prev => ({
      ...prev,
      country: prev.country || getCountryPricing(country).countryName,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        navigate('/')
      } else {
        // Check if subscription is expired
        if (result.error?.startsWith('SUBSCRIPTION_EXPIRED:')) {
          const parts = result.error.split(':')
          const daysExpired = parseInt(parts[1]) || 0
          const currentTier = (parts[2] || 'basic') as SubscriptionTier
          setSubscriptionExpired({ daysExpired, currentTier })
          setError('')
        } else {
          setError(result.error || 'Invalid email or password')
          setSubscriptionExpired(null)
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setSubscriptionExpired(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    // Show email input dialog
    setShowEmailInput(true)
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsCheckingEmail(true)

    try {
      const email = googleEmail.trim().toLowerCase()
      
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address')
        setIsCheckingEmail(false)
        return
      }

      // Check if user exists in database
      const existingUser = await userService.getByEmail(email)
      
      if (existingUser && existingUser.company_id) {
        // User exists and has a company - proceed with login
        const result = await login(email, '') // For Google users, we might use empty password or token-based auth
        
        if (result.success) {
          // Close email input dialog
          setShowEmailInput(false)
          setGoogleEmail('')
          // Navigate to home page
          navigate('/')
        } else {
          setError(result.error || 'Unable to sign in. Please contact support or use email/password login.')
        }
      } else {
        // User doesn't exist OR exists but has no company - show registration form
        setGoogleUserEmail(email)
        setGoogleUserName(email.split('@')[0]) // Use email prefix as default name
        setRegistrationMode('google')
        setRegistrationFormData(prev => ({ ...prev, email, name: email.split('@')[0] }))
        setShowEmailInput(false)
        setGoogleEmail('')
        setShowRegistrationForm(true)
      }
    } catch (err) {
      console.error('Email check error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleDirectRegistration = (isFreeTrial?: boolean) => {
    setRegistrationMode('direct')
    setIsFreeTrialRegistration(isFreeTrial ?? false) // Set free trial flag
    setGoogleUserEmail('')
    setGoogleUserName('')
    setRegistrationFormData({
      email: '',
      name: '',
      password: '',
      businessName: '',
      businessType: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: getCountryPricing(selectedCountry).countryName,
      phone: '',
      gstin: '',
      website: '',
      description: '',
      subscription_tier: 'basic' as SubscriptionTier,
    })
    setShowRegistrationForm(true)
  }

  const handleRegistrationSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmittingForm(true)
    setError('')

    try {
      const userEmail = registrationMode === 'google' ? googleUserEmail : registrationFormData.email
      const userName = registrationMode === 'google' ? googleUserName : registrationFormData.name
      const userPassword = registrationMode === 'google' ? '' : registrationFormData.password

      // Save registration request to database
      try {
        await registrationRequestService.create({
          name: userName,
          email: userEmail,
          password: userPassword || undefined,
          registration_method: registrationMode,
          business_name: registrationFormData.businessName,
          business_type: registrationFormData.businessType,
          address: registrationFormData.address,
          city: registrationFormData.city,
          state: registrationFormData.state,
          pincode: registrationFormData.pincode,
          country: registrationFormData.country,
          phone: registrationFormData.phone,
          gstin: registrationFormData.gstin || undefined,
          website: registrationFormData.website || undefined,
          description: registrationFormData.description || undefined,
          subscription_tier: registrationFormData.subscription_tier || 'basic',
          is_free_trial: isFreeTrialRegistration, // Include free trial flag
        })

        console.log('Registration request saved successfully to database')
      } catch (dbError: any) {
        console.error('Error saving registration request to database:', dbError)
        setError('Failed to save registration request. Please try again.')
        setIsSubmittingForm(false)
        return
      }

      // Prepare email content
      const emailSubject = encodeURIComponent('New User Registration Request - HisabKitab-Pro')
      const emailBody = encodeURIComponent(`
New User Registration Request

User Details:
- Name: ${userName}
- Email: ${userEmail}
- Registration Method: ${registrationMode === 'google' ? 'Google Sign-In' : 'Direct Registration'}

Business Details:
- Business Name: ${registrationFormData.businessName}
- Business Type: ${registrationFormData.businessType}
- Address: ${registrationFormData.address}
- City: ${registrationFormData.city}
- State: ${registrationFormData.state}
- Pincode: ${registrationFormData.pincode}
- Country: ${registrationFormData.country}
- Phone: ${registrationFormData.phone}
- GSTIN: ${registrationFormData.gstin || 'Not provided'}
- Website: ${registrationFormData.website || 'Not provided'}

Subscription Plan:
- Selected Plan: ${registrationFormData.subscription_tier === 'basic' ? 'Basic Plan' : registrationFormData.subscription_tier === 'standard' ? 'Standard Plan' : 'Premium Plan'}

Additional Information:
${registrationFormData.description || 'None provided'}

---
This is an automated message from HisabKitab-Pro registration form.
User data has been saved to database.
Please review and process this registration request.
      `)

      // Open email client with pre-filled content
      const mailtoLink = `mailto:hisabkitabpro@gmail.com?subject=${emailSubject}&body=${emailBody}`
      window.location.href = mailtoLink

      // Show success message
      alert('Thank you for your registration request! Your information has been saved. We will connect with you within 24 hours by email or contact. Please check your email for further instructions.')

      // Reset form
      setShowRegistrationForm(false)
      setIsFreeTrialRegistration(false) // Reset free trial flag
      setRegistrationFormData({
        email: '',
        name: '',
        password: '',
        businessName: '',
        businessType: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: '',
        phone: '',
        gstin: '',
        website: '',
        description: '',
        subscription_tier: 'basic' as SubscriptionTier,
      })
      setGoogleUserEmail('')
      setGoogleUserName('')
    } catch (err) {
      console.error('Registration form error:', err)
      setError('Failed to submit registration form. Please try again.')
    } finally {
      setIsSubmittingForm(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative w-full max-w-[1600px] flex gap-10 items-center">
        {/* Left Side - App Description & Features */}
        <div className="flex-[2] hidden lg:block">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="mb-6">
              {/* Enhanced Title Section */}
              <div className="text-center mb-6">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-100 mb-3 drop-shadow-2xl animate-fade-in">
                  HisabKitab-Pro
                </h1>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-3 rounded-full"></div>
                <p className="text-blue-50 text-xl font-semibold tracking-wide">
                  Complete Inventory Management System
                </p>
                <p className="text-blue-200/80 text-sm mt-2 font-medium">
                  Streamline Your Business Operations
                </p>
              </div>
              
              {/* Enhanced Country Selection */}
              <div className="mb-5">
                <label className="block text-white text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Globe className="w-5 h-5 text-blue-300" />
                  Select Your Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    applyCountrySelection(e.target.value)
                  }}
                  className="w-full bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-xl px-4 py-3 text-white font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all hover:bg-white/20 hover:border-white/40 cursor-pointer shadow-lg"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code} className="bg-gray-800">
                      {c.name} ({c.currencySymbol})
                    </option>
                  ))}
                </select>

                {/* 1 Month Free Trial Button - Same functionality as Fill Registration Form */}
                <div className="relative mt-4 pt-4">
                  {/* FREE Badge - Positioned above button */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-30 animate-bounce">
                    <div className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 text-yellow-900 text-sm font-black px-5 py-2 rounded-full shadow-2xl border-3 border-yellow-200 flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <span>FREE FOR 1 MONTH</span>
                      <span className="text-lg">✨</span>
                    </div>
                  </div>
                  
                  {/* Animated Glow Background */}
                  <div className="absolute inset-0 top-3 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-2xl blur-lg opacity-80 animate-pulse"></div>
                  
                  <button
                    type="button"
                    onClick={() => handleDirectRegistration(true)}
                    className="relative w-full mt-3 bg-gradient-to-r from-pink-600 via-rose-500 to-red-500 text-white font-bold text-lg py-4 px-6 rounded-2xl hover:from-pink-700 hover:via-rose-600 hover:to-red-600 transition-all duration-300 shadow-2xl hover:shadow-pink-500/50 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border-2 border-white/40 overflow-hidden group"
                  >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="text-3xl">🎁</span>
                      <div className="text-left">
                        <div className="text-lg font-extrabold tracking-wide drop-shadow-lg">Start Your FREE Trial Now!</div>
                        <div className="text-xs font-semibold text-white/90">No Credit Card Required • Full Access • Cancel Anytime</div>
                      </div>
                      <span className="text-3xl">🚀</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Special Pricing Display with Effects */}
              <div className="relative mb-4">
                {/* Animated Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur-xl opacity-75 animate-pulse"></div>
                
                {/* Hurry Up Badge */}
                <div className="absolute -top-3 -right-3 z-20 animate-bounce">
                  <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                    <span>🔥</span>
                    <span>HURRY UP!</span>
                  </div>
                </div>
                
                {/* New Year Sale Badge */}
                <div className="absolute -top-3 -left-3 z-20 animate-pulse">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    🎉 NEW YEAR SALE
                  </div>
                </div>
                
                {/* Main Pricing Card */}
                <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-6 py-4 rounded-xl font-bold text-xl text-center relative overflow-hidden border-2 border-white/30 shadow-2xl animate-shimmer">
                  {/* Animated Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer-slide"></div>
                  
                  <div className="relative z-10">
                    <div className="text-sm font-bold mb-2 tracking-wider uppercase">
                      Special {pricing.countryName} Pricing
                    </div>
                    <div className="text-4xl font-black mb-3 drop-shadow-2xl animate-scale leading-tight">
                      {formatPrice(pricing.yearlyPrice, pricing.currencySymbol)}<span className="text-2xl">/Year</span>
                    </div>
                    {pricing.originalPrice && (
                      <div className="text-base font-semibold mt-2 flex items-center justify-center gap-3 mb-3">
                        <span className="line-through opacity-60 text-xl">
                          {formatPrice(pricing.originalPrice, pricing.currencySymbol)}
                        </span>
                        {pricing.discountText && (
                          <span className="bg-green-500 px-4 py-1.5 rounded-full text-sm font-black shadow-xl animate-pulse border-2 border-green-300">
                            {pricing.discountText}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs font-bold mt-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full inline-block border border-white/20">
                      ⚡ First Year Discount Applied ⚡
                    </div>
                    
                    {/* Plan Details with Device Limits and Pricing */}
                                    <div className="mt-4 space-y-2">
                      {(['basic', 'standard', 'premium'] as SubscriptionTier[]).map((tier) => {
                        const tierPrice = calculateTierPrice(pricing.yearlyPrice, tier)
                        const tierOriginalPrice = calculateTierPrice(pricing.originalPrice || pricing.yearlyPrice * 2, tier)
                        const tierName = tier === 'basic' ? '📱 Basic Plan - 1 Device Access' : 
                                        tier === 'standard' ? '📱📱📱 Standard Plan - 3 Devices Access' : 
                                        '♾️ Premium Plan - Unlimited Devices'
                        const tierDescription = tier === 'premium' ? 'Supports: Mobile, Laptop, Desktop, Tablet (All Types)' : 
                                               'Supports: Mobile, Laptop, Desktop, Tablet'
                        
                        return (
                          <div key={tier} className={`${tier === 'basic' ? 'bg-white/15' : 'bg-white/10'} backdrop-blur-sm rounded-lg p-3 border ${tier === 'basic' ? 'border-white/20' : 'border-white/15'}`}>
                            <div className={`text-xs font-bold ${tier === 'basic' ? 'text-white/90' : 'text-white/85'} mb-1 flex items-center justify-between`}>
                              <span>{tierName}</span>
                              <div className="text-right">
                                <div className="line-through opacity-60 text-xs mb-0.5">
                                  {formatPrice(tierOriginalPrice, pricing.currencySymbol)}
                                </div>
                                <span className="font-extrabold">{formatPrice(tierPrice, pricing.currencySymbol)}/Year</span>
                              </div>
                            </div>
                            <div className={`text-xs ${tier === 'basic' ? 'text-white/80' : 'text-white/75'}`}>{tierDescription}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Key Features */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Key Features</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Complete product & inventory management with barcode support</p>
                </div>
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Purchase & sales management with GST/Simple purchase options</p>
                </div>
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Real-time analytics, reports & profit analysis</p>
                </div>
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-orange-400 to-red-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Multi-company support with role-based access control</p>
                </div>
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Stock alerts, payment tracking & commission management</p>
                </div>
                <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="p-2 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-blue-50 font-medium flex-1 pt-1">Secure offline-first architecture with automatic backups</p>
                </div>
              </div>
            </div>

            {/* Enhanced Description */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl p-5 border border-white/20 mb-4 shadow-lg">
              <p className="text-white text-sm leading-relaxed font-medium">
                <strong className="text-yellow-300 font-bold text-base">HisabKitab-Pro</strong> is a comprehensive inventory management solution designed for businesses of all sizes. 
                Manage your products, track purchases and sales, generate invoices, monitor stock levels, and analyze your business performance - all in one place.
              </p>
            </div>

            {/* Contact Information */}
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 animate-glow">
              <div className="flex items-center justify-center gap-2 text-white/90 mb-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Contact Us</span>
              </div>
              <a 
                href="mailto:hisabkitabpro@gmail.com" 
                className="text-blue-200 hover:text-blue-100 text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Mail className="w-3 h-3" />
                hisabkitabpro@gmail.com
              </a>
            </div>
            <style>{`
              @keyframes glow {
                0%, 100% {
                  box-shadow: 0 0 25px rgba(59, 130, 246, 0.8), 0 0 50px rgba(59, 130, 246, 0.5), 0 0 75px rgba(59, 130, 246, 0.3);
                  border-color: rgba(59, 130, 246, 0.8);
                }
                25% {
                  box-shadow: 0 0 25px rgba(34, 197, 94, 0.8), 0 0 50px rgba(34, 197, 94, 0.5), 0 0 75px rgba(34, 197, 94, 0.3);
                  border-color: rgba(34, 197, 94, 0.8);
                }
                50% {
                  box-shadow: 0 0 25px rgba(168, 85, 247, 0.8), 0 0 50px rgba(168, 85, 247, 0.5), 0 0 75px rgba(168, 85, 247, 0.3);
                  border-color: rgba(168, 85, 247, 0.8);
                }
                75% {
                  box-shadow: 0 0 25px rgba(251, 146, 60, 0.8), 0 0 50px rgba(251, 146, 60, 0.5), 0 0 75px rgba(251, 146, 60, 0.3);
                  border-color: rgba(251, 146, 60, 0.8);
                }
              }
              .animate-glow {
                animation: glow 3s ease-in-out infinite;
              }
              
              @keyframes shimmer {
                0%, 100% {
                  box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 146, 60, 0.6), 0 0 90px rgba(239, 68, 68, 0.4);
                }
                50% {
                  box-shadow: 0 0 40px rgba(251, 191, 36, 1), 0 0 80px rgba(251, 146, 60, 0.8), 0 0 120px rgba(239, 68, 68, 0.6);
                }
              }
              .animate-shimmer {
                animation: shimmer 2s ease-in-out infinite;
              }
              
              @keyframes shimmer-slide {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
              .animate-shimmer-slide {
                animation: shimmer-slide 3s ease-in-out infinite;
              }
              
              @keyframes scale {
                0%, 100% {
                  transform: scale(1);
                }
                50% {
                  transform: scale(1.05);
                }
              }
              .animate-scale {
                animation: scale 2s ease-in-out infinite;
              }
              
              @keyframes fade-in {
                0% {
                  opacity: 0;
                  transform: scale(0.9);
                }
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              .animate-fade-in {
                animation: fade-in 0.6s ease-out;
              }
            `}</style>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-2xl flex flex-col items-center justify-center">
          {/* Title for Mobile */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-4xl font-extrabold text-white mb-2">HisabKitab-Pro</h1>
            <p className="text-blue-100 text-lg mb-4">Inventory Management System</p>
            <div className="max-w-sm mx-auto mb-4 text-left">
              <label className="block text-white text-sm font-bold mb-2 flex items-center justify-center gap-2 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-blue-200" />
                Select Country for Pricing <span className="text-red-200">*</span>
              </label>
              <p className="text-blue-100/90 text-xs mb-2 text-center">
                If prices aren’t correct for your region, please select your country.
              </p>
              <select
                value={selectedCountry}
                onChange={(e) => applyCountrySelection(e.target.value)}
                className="w-full bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-xl px-4 py-3 text-white font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all hover:bg-white/20 hover:border-white/40 cursor-pointer shadow-lg"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code} className="bg-gray-800">
                    {c.name} ({c.currencySymbol})
                  </option>
                ))}
              </select>

              {/* Mobile - 1 Month Free Trial Button */}
              <div className="relative mt-4 pt-3">
                {/* FREE Badge - Positioned above button */}
                <div className="absolute -top-0 left-1/2 transform -translate-x-1/2 z-30 animate-bounce">
                  <div className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full shadow-2xl border-2 border-yellow-200 flex items-center gap-1">
                    <span>✨</span>
                    <span>FREE FOR 1 MONTH</span>
                    <span>✨</span>
                  </div>
                </div>
                
                {/* Animated Glow Background */}
                <div className="absolute inset-0 top-2 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-xl blur-md opacity-80 animate-pulse"></div>
                
                <button
                  type="button"
                  onClick={() => handleDirectRegistration(true)}
                  className="relative w-full mt-2 bg-gradient-to-r from-pink-600 via-rose-500 to-red-500 text-white font-bold text-sm py-3 px-4 rounded-xl hover:from-pink-700 hover:via-rose-600 hover:to-red-600 transition-all duration-300 shadow-2xl transform active:scale-[0.98] flex items-center justify-center gap-2 border-2 border-white/40 overflow-hidden"
                >
                  <span className="text-xl">🎁</span>
                  <div className="text-left">
                    <div className="text-sm font-extrabold">Start FREE Trial Now!</div>
                    <div className="text-xs text-white/90">No Card Required</div>
                  </div>
                  <span className="text-xl">🚀</span>
                </button>
              </div>
            </div>
            <div className="relative inline-block mb-2">
              {/* Mobile Badges */}
              <div className="absolute -top-2 -right-2 z-20 animate-bounce">
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                  🔥 HURRY!
                </div>
              </div>
              <div className="absolute -top-2 -left-2 z-20 animate-pulse">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                  🎉 SALE
                </div>
              </div>
              
              {/* Mobile Pricing Card */}
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-6 py-2 rounded-xl font-bold text-lg relative overflow-hidden border-2 border-white/30 shadow-2xl animate-shimmer">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer-slide"></div>
                
                <div className="relative z-10">
                  <div className="text-sm font-semibold mb-0.5">Special {pricing.countryName} Pricing</div>
                  <div className="text-xl font-extrabold drop-shadow-lg animate-scale">
                    {formatPrice(pricing.yearlyPrice, pricing.currencySymbol)}/Year
                  </div>
                  {pricing.originalPrice && (
                    <div className="text-xs font-normal mt-0.5 flex items-center justify-center gap-1">
                      <span className="line-through opacity-75">
                        {formatPrice(pricing.originalPrice, pricing.currencySymbol)}
                      </span>
                      {pricing.discountText && (
                        <span className="bg-green-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          {pricing.discountText}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-xs font-semibold mt-1 bg-black/20 px-2 py-0.5 rounded-full inline-block">
                    ⚡ First Year Discount ⚡
                  </div>
                  <div className="text-xs font-semibold mt-1.5 text-white/90 bg-white/10 px-2 py-1 rounded-lg inline-block">
                    📱 1 Device (Basic) - Mobile, Laptop, Desktop, Tablet
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Login Card - Enhanced */}
          <div className="bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 w-full border-2 border-white/30 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Logo above Sign In - Enhanced */}
              <div className="flex items-center justify-center mb-10 w-full px-4">
                <img 
                  src="/icons/icon-512x512.png" 
                  alt="HisabKitab-Pro Logo" 
                  className="h-36 w-auto max-w-full object-contain drop-shadow-2xl animate-fade-in"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/icons/20251231_2153_Hisab Kitab Logo_simple_compose_01kdtkg9vhemx9ry020kjvfe1d.png'
                  }}
                />
              </div>
              
              <h2 className="text-4xl font-extrabold mb-10 text-center tracking-tight text-gray-800">
                Sign In to Your Account
              </h2>

              {error && (
                <div className="mb-6 w-full bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3 shadow-lg">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <span className="text-base font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full space-y-7">
                <div>
                  <label htmlFor="email" className="block text-lg font-bold text-gray-800 mb-4 text-center">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-14 pr-5 py-5 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none hover:border-gray-400 shadow-md hover:shadow-lg bg-white"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-lg font-bold text-gray-800 mb-4 text-center">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-14 pr-5 py-5 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none hover:border-gray-400 shadow-md hover:shadow-lg bg-white"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xl py-5 px-8 rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="relative z-10">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-6 h-6 relative z-10" />
                      <span className="relative z-10">Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-semibold">OR</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-white text-gray-700 font-bold text-xl py-5 px-8 rounded-2xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                {isGoogleLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    {/* Google Icon SVG */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-semibold">OR</span>
                </div>
              </div>

              {/* Register Button */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => handleDirectRegistration(false)}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-xl py-5 px-8 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  <UserPlus className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">Fill Registration Form</span>
                </button>
                <div className="mt-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-base font-bold text-gray-800">
                      Quick Registration Process
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Complete the registration form above with your business details, and our team will reach out to you within <span className="font-bold text-blue-600">24 hours</span> via email to activate your account and get you started! 🚀
                  </p>
                </div>
              </div>

              {/* Contact & Footer - Enhanced */}
              <div className="text-center mt-10 w-full space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-lg rounded-xl p-4 border-2 border-blue-200/50 shadow-lg">
                  <div className="flex items-center justify-center gap-2 text-gray-700 mb-2">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-base font-bold">Contact Us</span>
                  </div>
                  <a 
                    href="mailto:hisabkitabpro@gmail.com" 
                    className="text-blue-600 hover:text-blue-700 text-base font-semibold transition-colors flex items-center justify-center gap-2 hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    hisabkitabpro@gmail.com
                  </a>
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  © 2024 HisabKitab. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Input Modal for Google Sign-In */}
      {showEmailInput && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Sign in with Google</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Please enter your email address to continue
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmailInput(false)
                  setGoogleEmail('')
                  setError('')
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEmailSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter your email address"
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailInput(false)
                    setGoogleEmail('')
                    setError('')
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCheckingEmail}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCheckingEmail ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold">Complete Your Registration</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Fill in your business details and our team will activate your account within <span className="font-bold">24 hours</span> via email.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRegistrationForm(false)
                  setError('')
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRegistrationSubmit} className="p-6 space-y-6">
              {/* Information Message */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500 rounded-full flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-green-900 mb-2 flex items-center gap-2">
                      <span>✨ Quick & Easy Registration</span>
                    </p>
                    <p className="text-sm text-green-800 leading-relaxed">
                      Simply fill out all the required details below. Once you submit the form, our team will review your information and <span className="font-bold text-green-900">activate your account within 24 hours</span>. You'll receive a confirmation email with your login credentials and next steps to get started! 🎉
                    </p>
                  </div>
                </div>
              </div>

              {/* Mandatory Pricing Country Selection */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <p className="text-sm font-bold text-blue-900 mb-1">
                      Select your country for correct pricing <span className="text-red-600">*</span>
                    </p>
                    <p className="text-xs text-blue-800 mb-3">
                      If prices aren’t visible correctly for your region, select your country once. We’ll use this selection across devices/pages.
                    </p>
                    <select
                      required
                      value={selectedCountry}
                      onChange={(e) => applyCountrySelection(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.currencySymbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* User Info Message */}
              {registrationMode === 'google' && (
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-900 mb-1">
                        Account Not Found
                      </p>
                      <p className="text-sm text-yellow-800">
                        As per our records, you are not associated with any user or company. Please complete the registration form below to create your account.
                      </p>
                      <p className="text-xs text-yellow-700 mt-2">
                        <strong>Email:</strong> {googleUserEmail}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* User Details (Only for Direct Registration) */}
              {registrationMode === 'direct' && (
                <>
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">User Information</h4>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={registrationFormData.name}
                        onChange={(e) => setRegistrationFormData({ ...registrationFormData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={registrationFormData.email}
                        onChange={(e) => setRegistrationFormData({ ...registrationFormData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={registrationFormData.password}
                        onChange={(e) => setRegistrationFormData({ ...registrationFormData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Enter your password"
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4 mt-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Business Information</h4>
                  </div>
                </>
              )}

              {/* Business Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={registrationFormData.businessName}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, businessName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter your business name"
                  />
                </div>
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={registrationFormData.businessType}
                  onChange={(e) => setRegistrationFormData({ ...registrationFormData, businessType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select business type</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Distribution">Distribution</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Service">Service</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    required
                    value={registrationFormData.address}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Enter your business address"
                  />
                </div>
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationFormData.city}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationFormData.state}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, state: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationFormData.pincode}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, pincode: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Pincode"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={registrationFormData.country}
                  onChange={(e) => setRegistrationFormData({ ...registrationFormData, country: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={registrationFormData.phone}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={registrationFormData.gstin}
                  onChange={(e) => setRegistrationFormData({ ...registrationFormData, gstin: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter GSTIN if applicable"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={registrationFormData.website}
                  onChange={(e) => setRegistrationFormData({ ...registrationFormData, website: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Additional Information (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={registrationFormData.description}
                    onChange={(e) => setRegistrationFormData({ ...registrationFormData, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    rows={4}
                    placeholder="Tell us more about your business, requirements, or any questions..."
                  />
                </div>
              </div>

              {/* Subscription Plan Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Select Subscription Plan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['basic', 'standard', 'premium'] as SubscriptionTier[]).map((tier) => {
                    const tierInfo = getTierPricing(tier)
                    const tierPrice = calculateTierPrice(pricing.yearlyPrice, tier)
                    const tierOriginalPrice = calculateTierPrice(pricing.originalPrice || pricing.yearlyPrice * 2, tier)
                    const maxUsers = getMaxUsersForPlan(tier)
                    const isSelected = registrationFormData.subscription_tier === tier
                    
                    return (
                      <div
                        key={tier}
                        onClick={() => setRegistrationFormData({ ...registrationFormData, subscription_tier: tier })}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{tierInfo.name}</h4>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 line-through mb-1">
                            {formatPrice(tierOriginalPrice, pricing.currencySymbol)}
                          </div>
                          <div className="text-2xl font-extrabold text-gray-900">
                            {formatPrice(tierPrice, pricing.currencySymbol)}
                            <span className="text-sm font-normal">/Year</span>
                          </div>
                          <div className="inline-block mt-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            50% OFF
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          Max Users: {maxUsers === 'unlimited' ? 'Unlimited' : maxUsers}
                        </div>
                        <div className="text-xs text-gray-600">
                          Devices: {tierInfo.deviceLimit === 'unlimited' ? 'Unlimited' : tierInfo.deviceLimit}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegistrationForm(false)
                    setError('')
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingForm ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>Submit Registration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Expired Modal */}
      {subscriptionExpired && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-3xl flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold">Subscription Expired</h3>
                <p className="text-red-100 text-sm mt-1">
                  Your subscription expired {subscriptionExpired.daysExpired} day{subscriptionExpired.daysExpired !== 1 ? 's' : ''} ago. Please renew to continue.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubscriptionExpired(null)
                  setError('')
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Warning Message */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-1">
                      Access Suspended
                    </p>
                    <p className="text-sm text-red-800">
                      Your subscription has expired. Please recharge your plan to regain access to all features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Select a Plan to Renew</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['basic', 'standard', 'premium'] as SubscriptionTier[]).map((tier) => {
                    const tierInfo = getTierPricing(tier)
                    const tierPrice = calculateTierPrice(pricing.yearlyPrice, tier)
                    const tierOriginalPrice = calculateTierPrice(pricing.originalPrice || pricing.yearlyPrice * 2, tier)
                    const maxUsers = getMaxUsersForPlan(tier)
                    const isCurrentTier = subscriptionExpired.currentTier === tier
                    
                    return (
                      <div
                        key={tier}
                        className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          isCurrentTier
                            ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-gray-900 text-lg">{tierInfo.name}</h5>
                          {isCurrentTier && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          <div className="text-sm text-gray-500 line-through mb-1">
                            {formatPrice(tierOriginalPrice, pricing.currencySymbol)}
                          </div>
                          <div className="text-3xl font-extrabold text-gray-900">
                            {formatPrice(tierPrice, pricing.currencySymbol)}
                            <span className="text-sm font-normal">/Year</span>
                          </div>
                          <div className="inline-block mt-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            50% OFF
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Devices: {tierInfo.deviceLimit === 'unlimited' ? 'Unlimited' : tierInfo.deviceLimit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Users: {maxUsers === 'unlimited' ? 'Unlimited' : maxUsers}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Open email to contact for renewal
                            const emailSubject = encodeURIComponent(`Subscription Renewal Request - ${tierInfo.name}`)
                            const emailBody = encodeURIComponent(`
Subscription Renewal Request

Current Plan: ${subscriptionExpired.currentTier}
Requested Plan: ${tierInfo.name}
Price: ${formatPrice(tierPrice, pricing.currencySymbol)}/Year

Please process this renewal request to restore access to the system.

Thank you!
                            `)
                            window.location.href = `mailto:hisabkitabpro@gmail.com?subject=${emailSubject}&body=${emailBody}`
                          }}
                          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                            isCurrentTier
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {isCurrentTier ? 'Renew This Plan' : 'Select This Plan'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 mb-2">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-bold">Need Help?</span>
                </div>
                <p className="text-sm text-blue-800 mb-2">
                  Contact us for assistance with renewal or to discuss custom plans:
                </p>
                <a 
                  href="mailto:hisabkitabpro@gmail.com" 
                  className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors flex items-center gap-2 hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  hisabkitabpro@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login

