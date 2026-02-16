import { useState, useEffect } from 'react'
import { X, CreditCard, Smartphone, Building2, Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SubscriptionPayment, RechargePlan, PaymentGateway, PaymentMethod, DurationMonths } from '../types/subscriptionPayment'
import { SubscriptionTier } from '../types/device'
import { subscriptionPaymentService, getRechargePlans, calculatePaymentBreakdown } from '../services/subscriptionPaymentService'
import { razorpayService } from '../services/razorpayService'
import { companyService } from '../services/companyService'
import { COUNTRY_OPTIONS, getCountryPricing, getSavedCountry, isSupportedCountryCode, saveCountry } from '../utils/pricing'

interface SubscriptionRechargeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentTier?: SubscriptionTier
  currentEndDate?: string
}

const SubscriptionRechargeModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentTier = 'basic',
  currentEndDate,
}: SubscriptionRechargeModalProps) => {
  const { user, getCurrentCompanyId } = useAuth()
  const [selectedDuration, setSelectedDuration] = useState<DurationMonths>(12)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('upi')
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('razorpay')
  const [upiId, setUpiId] = useState('')
  const [plans, setPlans] = useState<RechargePlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null)
  const [paymentBreakdown, setPaymentBreakdown] = useState<ReturnType<typeof calculatePaymentBreakdown> | null>(null)
  const [plansLoading, setPlansLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState<string>('US') // Default to USA
  const [countrySource, setCountrySource] = useState<'default' | 'saved' | 'detected' | 'manual'>('default')
  const [showCountrySelector, setShowCountrySelector] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadPlans()
    }
  }, [isOpen, currentTier, user])

  useEffect(() => {
    if (selectedPlan) {
      const breakdown = calculatePaymentBreakdown(selectedPlan.final_price)
      setPaymentBreakdown(breakdown)
    }
  }, [selectedPlan])

  const loadPlans = async () => {
    setPlansLoading(true)
    setError(null)
    try {
      // Harden tier and country inputs (avoid any runtime mismatch)
      const tierSafe: any =
        currentTier === 'basic' || currentTier === 'standard' || currentTier === 'premium' || currentTier === 'premium_plus' || currentTier === 'premium_plus_plus' ? currentTier : 'basic'

      // 1) Use saved country immediately (fast + avoids confusion)
      const saved = getSavedCountry()
      // Default pricing country: USA (US). If user has a saved country we trust that.
      const immediateCountry = isSupportedCountryCode(saved) ? (saved as string) : 'US'
      setCountryCode(immediateCountry)
      setCountrySource(isSupportedCountryCode(saved) ? 'saved' : 'default')

      // IMPORTANT: show plans immediately (do not block UI on IndexedDB/company lookup)
      const rechargePlans = getRechargePlans(tierSafe, immediateCountry)
      setPlans(rechargePlans)

      const defaultPlan =
        rechargePlans.find(p => p.duration_months === selectedDuration) || rechargePlans[0] || null
      setSelectedPlan(defaultPlan)
      if (defaultPlan) setSelectedDuration(defaultPlan.duration_months)

      // 2) If detection is slow, show manual selector so user isn't confused
      const selectorTimer = window.setTimeout(() => setShowCountrySelector(true), 900)

      // 3) Try to refine country from company in the background (non-blocking)
      const companyId = getCurrentCompanyId?.()
      if (companyId) {
        Promise.race([
          companyService.getById(companyId),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 900)),
        ])
          .then((company: any) => {
            const raw = (company?.country || '').toString().trim()
            const resolvedCountry = isSupportedCountryCode(raw) ? raw : immediateCountry
            if (resolvedCountry && resolvedCountry !== immediateCountry) {
              setCountryCode(resolvedCountry)
              setCountrySource('detected')
              saveCountry(resolvedCountry)
              const refinedPlans = getRechargePlans(tierSafe, resolvedCountry)
              setPlans(refinedPlans)
              const refinedDefault =
                refinedPlans.find(p => p.duration_months === selectedDuration) || refinedPlans[0] || null
              setSelectedPlan(refinedDefault)
              if (refinedDefault) setSelectedDuration(refinedDefault.duration_months)
            }
            // If we successfully detected company country quickly, no need to show selector
            setShowCountrySelector(false)
          })
          .catch(() => {
            // ignore background errors
          })
          .finally(() => {
            window.clearTimeout(selectorTimer)
          })
      } else {
        window.clearTimeout(selectorTimer)
      }
    } catch (err) {
      console.error('Error loading plans:', err)
      setPlans([])
      setSelectedPlan(null)
      setError('Failed to load recharge plans. Please try again.')
    } finally {
      setPlansLoading(false)
    }
  }

  const applyManualCountry = (code: string) => {
    const tierSafe: any =
      currentTier === 'basic' || currentTier === 'standard' || currentTier === 'premium' || currentTier === 'premium_plus' || currentTier === 'premium_plus_plus' ? currentTier : 'basic'
    const normalized = code.trim().toUpperCase()
    if (!isSupportedCountryCode(normalized)) {
      setError('Unsupported country selection. Please select from the list.')
      return
    }
    setError(null)
    setCountryCode(normalized)
    setCountrySource('manual')
    saveCountry(normalized)
    const updated = getRechargePlans(tierSafe, normalized)
    setPlans(updated)
    const next = updated.find(p => p.duration_months === selectedDuration) || updated[0] || null
    setSelectedPlan(next)
    if (next) setSelectedDuration(next.duration_months)
  }

  const handlePlanSelect = (plan: RechargePlan) => {
    setSelectedPlan(plan)
    setSelectedDuration(plan.duration_months)
  }

  const handlePayment = async () => {
    if (!selectedPlan || !paymentBreakdown || !user) {
      setError('Please select a plan')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Early validation: Razorpay requires key and INR
      if (selectedGateway === 'razorpay') {
        const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID
        if (!keyId || keyId.trim() === '') {
          setError(
            'Online payment (Razorpay) is not configured yet. Please use "Direct UPI" below or contact support.'
          )
          setProcessing(false)
          return
        }
        const countryPricing = getCountryPricing(countryCode)
        if (countryPricing.currency !== 'INR') {
          setError(
            'Razorpay is only available for payments in INR (India). Please select India as country above, or use "Direct UPI".'
          )
          setProcessing(false)
          return
        }
      }

      const companyId = getCurrentCompanyId?.()

      // Create payment record
      const payment: Omit<SubscriptionPayment, 'id' | 'created_at' | 'updated_at'> = {
        company_id: companyId ?? undefined,
        user_id: parseInt(user.id),
        subscription_tier: currentTier,
        amount: paymentBreakdown.amount,
        gst_amount: paymentBreakdown.gst_amount,
        gateway_fee: 0, // Waived via discount; user pays only base + GST
        total_amount: paymentBreakdown.total_amount,
        currency: countryCode === 'IN' ? 'INR' : 'USD',
        payment_gateway: selectedGateway,
        payment_method: selectedPaymentMethod,
        payment_status: 'pending',
        duration_months: selectedDuration,
        auto_renewal_enabled: true,
        upi_id: selectedGateway === 'upi_direct' ? upiId : undefined,
      }

      const paymentRecord = await subscriptionPaymentService.createPayment(payment)

      // Handle direct UPI payment (manual verification)
      if (selectedGateway === 'upi_direct') {
        if (!upiId) {
          setError('Please enter UPI ID')
          setProcessing(false)
          return
        }
        // For direct UPI, show instructions and mark as pending
        alert(
          `UPI Payment Instructions:\n\n` +
          `1. Send ₹${paymentBreakdown.total_amount.toFixed(2)} to: ${upiId}\n` +
          `2. Use payment reference: PAY-${paymentRecord.id}\n` +
          `3. After payment, contact support with transaction ID\n\n` +
          `Payment will be verified manually.`
        )
        setProcessing(false)
        onClose()
        return
      }

      // Handle Razorpay payment
      if (selectedGateway === 'razorpay') {
        const countryPricing = getCountryPricing(countryCode)
        const currency = countryPricing.currency

        // Create Razorpay order
        const order = await razorpayService.createOrder(
          paymentBreakdown.total_amount,
          currency,
          `sub_${paymentRecord.id}`
        )

        // Update payment with order ID
        await subscriptionPaymentService.updatePaymentStatus(
          paymentRecord.id,
          'processing',
          undefined,
          undefined
        )

        // Open Razorpay checkout
        await razorpayService.openCheckout(
          order.id,
          paymentBreakdown.total_amount,
          currency,
          {
            name: 'HisabKitab-Pro',
            description: `${selectedPlan.label} Subscription - ${currentTier.toUpperCase()} Plan`,
            prefill: {
              email: user.email,
              name: user.name,
              contact: (user as any).phone || undefined,
            },
            theme: {
              color: '#3399cc',
            },
            handler: async (response) => {
              try {
                // Prefer backend verification when API is configured
                const verifiedViaApi = await razorpayService.verifyPaymentViaApi(
                  response.razorpay_order_id,
                  response.razorpay_payment_id,
                  response.razorpay_signature
                )
                const isValid =
                  verifiedViaApi ||
                  razorpayService.verifySignature(
                    response.razorpay_order_id,
                    response.razorpay_payment_id,
                    response.razorpay_signature
                  )

                if (!isValid) {
                  throw new Error('Payment verification failed')
                }

                // Update payment status
                await subscriptionPaymentService.updatePaymentStatus(
                  paymentRecord.id,
                  'success',
                  response.razorpay_payment_id,
                  response.razorpay_signature
                )

                // Process payment and update subscription
                await subscriptionPaymentService.processSuccessfulPayment(paymentRecord.id)

                setProcessing(false)
                if (onSuccess) {
                  onSuccess()
                }
                onClose()
              } catch (err: any) {
                console.error('Payment processing error:', err)
                setError(err.message || 'Payment processing failed')
                setProcessing(false)
              }
            },
            onError: (err) => {
              console.error('Payment error:', err)
              setError(err.message || 'Payment failed')
              setProcessing(false)
            },
          }
        )
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err)
      setError(err.message || 'Failed to initiate payment')
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  const countryPricing = getCountryPricing(countryCode)
  const currencySymbol = countryPricing.currencySymbol

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Subscription Recharge</h2>
            <p className="text-sm text-gray-600 mt-1">
              Current Plan: <span className="font-semibold capitalize">{currentTier}</span>
              {currentEndDate && (
                <>
                  {' • '}
                  Expires: {new Date(currentEndDate).toLocaleDateString('en-IN')}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pricing Country (Detected / Manual) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Pricing Country</p>
                <p className="text-xs text-gray-600 mt-1">
                  Using country: <span className="font-bold">{countryCode}</span>{' '}
                  <span className="text-gray-500">
                    (
                    {countrySource === 'detected'
                      ? 'detected'
                      : countrySource === 'saved'
                        ? 'saved'
                        : countrySource === 'manual'
                          ? 'manual'
                          : 'default'}
                    )
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  If this is wrong or loading is slow, select your country below. We will re-verify automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCountrySelector(v => !v)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
                disabled={plansLoading || processing}
              >
                {showCountrySelector ? 'Hide' : 'Change'}
              </button>
            </div>

            {showCountrySelector && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Select Country</label>
                <select
                  value={countryCode}
                  onChange={(e) => applyManualCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  disabled={plansLoading || processing}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Duration</h3>
            {plans.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-lg">
                {plansLoading ? 'Loading plans…' : 'Plans could not be loaded. Please click refresh and try again.'}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={loadPlans}
                    className="px-3 py-2 bg-white border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-semibold"
                    disabled={processing || plansLoading}
                  >
                    {plansLoading ? 'Loading…' : 'Refresh Plans'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.duration_months}
                    onClick={() => handlePlanSelect(plan)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPlan?.duration_months === plan.duration_months
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={processing}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{plan.label}</span>
                      {plan.discount_percentage && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          {plan.discount_percentage}% OFF
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {plan.discount_percentage && plan.savings ? (
                        <p className="text-xs text-gray-500 line-through">
                          {currencySymbol}{plan.base_price.toLocaleString()}
                        </p>
                      ) : null}
                      <p className="text-xl font-bold text-gray-900">
                        {currencySymbol}{plan.final_price.toLocaleString()}
                      </p>
                      {plan.savings ? (
                        <p className="text-xs text-green-600 font-medium">
                          Save {currencySymbol}{plan.savings.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          {paymentBreakdown && selectedPlan && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Amount:</span>
                  <span className="font-medium">{currencySymbol}{paymentBreakdown.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST (18%):</span>
                  <span className="font-medium">{currencySymbol}{paymentBreakdown.gst_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee (2% + GST):</span>
                  <span className="font-medium text-gray-500">
                    {currencySymbol}{paymentBreakdown.gateway_fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="font-medium">Discount (platform fee on us):</span>
                  <span className="font-medium">
                    -{currencySymbol}{paymentBreakdown.platform_fee_discount.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">You pay:</span>
                    <span className="font-bold text-lg text-gray-900">
                      {currencySymbol}{paymentBreakdown.total_amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    No platform fee charged. You pay only base + GST.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedPaymentMethod('upi')
                  setSelectedGateway('razorpay')
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedPaymentMethod === 'upi' && selectedGateway === 'razorpay'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={processing}
              >
                <Smartphone className="w-5 h-5 text-gray-600" />
                <span className="font-medium">UPI (Razorpay)</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPaymentMethod('card')
                  setSelectedGateway('razorpay')
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedPaymentMethod === 'card'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={processing}
              >
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Card</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPaymentMethod('netbanking')
                  setSelectedGateway('razorpay')
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedPaymentMethod === 'netbanking'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={processing}
              >
                <Building2 className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Net Banking</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPaymentMethod('wallet')
                  setSelectedGateway('razorpay')
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedPaymentMethod === 'wallet'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={processing}
              >
                <Wallet className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Wallets</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPaymentMethod('upi')
                  setSelectedGateway('upi_direct')
                  setError(null)
                }}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  selectedGateway === 'upi_direct'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-300'
                }`}
                disabled={processing}
              >
                <Smartphone className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Direct UPI (manual)</span>
              </button>
            </div>
            {selectedGateway === 'upi_direct' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID / VPA to receive payment
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@paytm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  disabled={processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customer will send payment to this UPI ID. You will verify manually.
                </p>
              </div>
            )}
          </div>

          {/* Auto-renewal Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Auto-Renewal Enabled</p>
                <p className="text-sm text-blue-700 mt-1">
                  Your subscription will automatically renew before expiry. You can disable this anytime from settings.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={
                processing ||
                !selectedPlan ||
                !paymentBreakdown ||
                (selectedGateway === 'upi_direct' && !upiId.trim())
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment
                  <CreditCard className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionRechargeModal
