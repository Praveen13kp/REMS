// Load Razorpay Checkout once. The SDK is a `<script>` tag; we lazy-load
// it the first time the user hits Upgrade so the landing page isn't
// slowed by a CDN fetch nobody needs.

let _loadPromise = null

export function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (_loadPromise) return _loadPromise

  _loadPromise = new Promise((resolve) => {
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => {
      _loadPromise = null
      resolve(false)
    }
    document.body.appendChild(s)
  })
  return _loadPromise
}

// Opens Razorpay Checkout for a subscription. `subscriptionId` comes from
// our BE — see billingService.createSubscription().
export async function openRazorpayCheckout({
  keyId,
  subscriptionId,
  name = "LeadPro Realty",
  description,
  prefill = {},
  themeColor = "#8b5cf6",
  onSuccess,
  onDismiss,
}) {
  const loaded = await loadRazorpayCheckout()
  if (!loaded || !window.Razorpay) {
    throw new Error("Failed to load Razorpay Checkout — check your network")
  }
  const rzp = new window.Razorpay({
    key: keyId,
    subscription_id: subscriptionId,
    name,
    description,
    prefill,
    theme: { color: themeColor },
    handler: (response) => {
      // response: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
      // We deliberately do NOT trust the FE here — plan flips on the BE
      // webhook. The handler just lets us optimistically refresh the page.
      onSuccess?.(response)
    },
    modal: {
      ondismiss: () => onDismiss?.(),
    },
  })
  rzp.open()
}
