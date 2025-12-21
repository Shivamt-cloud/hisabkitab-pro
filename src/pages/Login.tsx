import { useState, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, User, Package, ShoppingCart, TrendingUp, Users, BarChart3, Shield, CheckCircle, MessageCircle } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = await login(email, password)
      if (success) {
        navigate('/')
      } else {
        setError('Invalid email or password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative w-full max-w-6xl flex gap-8 items-center">
        {/* Left Side - App Description & Features */}
        <div className="flex-1 hidden lg:block">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="mb-6">
              <h1 className="text-4xl font-extrabold text-white mb-3">HisabKitab-Pro</h1>
              <p className="text-blue-100 text-lg mb-4">Complete Inventory Management System</p>
              
              {/* Special Indian Pricing */}
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl font-bold text-xl text-center mb-4 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="text-sm font-normal mb-1">Special Indian Pricing</div>
                  <div className="text-2xl">₹6,000/Year</div>
                  <div className="text-sm font-normal mt-1 flex items-center justify-center gap-2">
                    <span className="line-through opacity-75">₹7,059</span>
                    <span className="bg-green-500 px-2 py-0.5 rounded text-xs">15% OFF</span>
                  </div>
                  <div className="text-xs font-normal mt-1">First Year Discount Applied</div>
                </div>
              </div>

              {/* International Pricing Structure */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                <h3 className="text-white font-semibold mb-3 text-sm">International Pricing (USD):</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Small Business</span>
                    <span className="text-white font-medium">$50-200/month</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Midsize Business</span>
                    <span className="text-white font-medium">$200-700/month</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Enterprise</span>
                    <span className="text-white font-medium">$1,000-10,000+/month</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Key Features:</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Complete product & inventory management with barcode support</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Purchase & sales management with GST/Simple purchase options</p>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Real-time analytics, reports & profit analysis</p>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Multi-company support with role-based access control</p>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Stock alerts, payment tracking & commission management</p>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-100">Secure offline-first architecture with automatic backups</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-4">
              <p className="text-white text-sm leading-relaxed">
                <strong className="text-yellow-300">HisabKitab-Pro</strong> is a comprehensive inventory management solution designed for businesses of all sizes. 
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
                href="mailto:freetoolhubcommunity@gmail.com" 
                className="text-blue-200 hover:text-blue-100 text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Mail className="w-3 h-3" />
                freetoolhubcommunity@gmail.com
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
            `}</style>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md">
          {/* Logo and Title for Mobile */}
          <div className="text-center mb-8 lg:hidden">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4 shadow-xl">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">HisabKitab-Pro</h1>
            <p className="text-blue-100 text-lg mb-4">Inventory Management System</p>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-xl font-bold text-lg inline-block mb-2 relative">
              <div className="text-sm font-normal mb-0.5">Special Indian Pricing</div>
              <div className="text-xl">₹6,000/Year</div>
              <div className="text-xs font-normal mt-0.5 flex items-center justify-center gap-1">
                <span className="line-through opacity-75">₹7,059</span>
                <span className="bg-green-500 px-1.5 py-0.5 rounded">15% OFF</span>
              </div>
            </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Sign In to Your Account
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

          {/* Contact & Footer */}
          <div className="text-center mt-6 space-y-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20 animate-glow-mobile">
              <div className="flex items-center justify-center gap-2 text-white/90 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Contact Us</span>
              </div>
              <a 
                href="mailto:freetoolhubcommunity@gmail.com" 
                className="text-blue-200 hover:text-blue-100 text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Mail className="w-3 h-3" />
                freetoolhubcommunity@gmail.com
              </a>
            </div>
            <p className="text-white/80 text-sm">
          © 2024 HisabKitab. All rights reserved.
        </p>
            <style>{`
              @keyframes glow-mobile {
                0%, 100% {
                  box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.3);
                  border-color: rgba(59, 130, 246, 0.8);
                }
                25% {
                  box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.5), 0 0 60px rgba(34, 197, 94, 0.3);
                  border-color: rgba(34, 197, 94, 0.8);
                }
                50% {
                  box-shadow: 0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.5), 0 0 60px rgba(168, 85, 247, 0.3);
                  border-color: rgba(168, 85, 247, 0.8);
                }
                75% {
                  box-shadow: 0 0 20px rgba(251, 146, 60, 0.8), 0 0 40px rgba(251, 146, 60, 0.5), 0 0 60px rgba(251, 146, 60, 0.3);
                  border-color: rgba(251, 146, 60, 0.8);
                }
              }
              .animate-glow-mobile {
                animation: glow-mobile 3s ease-in-out infinite;
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

