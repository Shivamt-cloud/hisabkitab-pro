/**
 * Global Search (Quick Win #1) – Ctrl+K / Cmd+K
 * Search products, customers, sales (invoices), and purchases. Click to navigate.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { productService } from '../services/productService'
import { customerService } from '../services/customerService'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import type { Product } from '../services/productService'
import type { Customer } from '../types/customer'
import type { Sale } from '../types/sale'
import type { Purchase } from '../types/purchase'
import { Search, Package, Users, FileText, ShoppingCart, ShoppingBag, X } from 'lucide-react'

const SEARCH_KEYS = ['ctrl+k', 'meta+k']

export function GlobalSearch() {
  const navigate = useNavigate()
  const { user, getCurrentCompanyId } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const openSearch = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  // Keyboard: Ctrl+K / Cmd+K to open; also listen for custom event (e.g. from Dashboard button)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.metaKey ? 'meta+' : ''}${e.key.toLowerCase()}`
      if (SEARCH_KEYS.includes(key)) {
        e.preventDefault()
        if (user) openSearch()
      }
      if (e.key === 'Escape') closeSearch()
    }
    const handleOpenEvent = () => {
      if (user) openSearch()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('global-search-open', handleOpenEvent)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('global-search-open', handleOpenEvent)
    }
  }, [user, openSearch, closeSearch])

  // Load data when modal opens
  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    const companyId = getCurrentCompanyId()
    Promise.all([
      productService.getAll(true, companyId ?? undefined),
      customerService.getAll(true, companyId ?? undefined),
      saleService.getAll(true, companyId ?? undefined),
      purchaseService.getAll(undefined, companyId ?? undefined),
    ])
      .then(([p, c, s, purchasesData]) => {
        setProducts(p)
        setCustomers(c)
        setSales(s)
        setPurchases(purchasesData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, user, getCurrentCompanyId])

  const q = (query || '').trim().toLowerCase()
  const filteredProducts = q
    ? products.filter(
        p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q)
      )
    : []
  const filteredCustomers = q
    ? customers.filter(
        c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          (c.email || '').toLowerCase().includes(q)
      )
    : []
  const filteredSales = q
    ? sales.filter(s => (s.invoice_number || '').toLowerCase().includes(q) || String(s.id).includes(q))
    : []
  const filteredPurchases = q
    ? purchases.filter(
        p =>
          (p.type === 'gst' ? (p as any).invoice_number : (p as any).invoice_number || '')?.toLowerCase().includes(q) ||
          (p.type === 'gst' ? (p as any).supplier_name : (p as any).supplier_name || '')?.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      )
    : []

  const totalResults = filteredProducts.length + filteredCustomers.length + filteredSales.length + filteredPurchases.length
  const productLimit = 5
  const customerLimit = 5
  const salesLimit = 5
  const purchaseLimit = 5
  const sliceProducts = filteredProducts.slice(0, productLimit)
  const sliceCustomers = filteredCustomers.slice(0, customerLimit)
  const sliceSales = filteredSales.slice(0, salesLimit)
  const slicePurchases = filteredPurchases.slice(0, purchaseLimit)

  const flatItems: { type: 'product' | 'customer' | 'sale' | 'purchase'; id: number; label: string; path: string }[] = []
  sliceProducts.forEach(p => flatItems.push({ type: 'product', id: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`, path: `/products/${p.id}/edit` }))
  sliceCustomers.forEach(c => flatItems.push({ type: 'customer', id: c.id, label: c.name || '', path: '/customers' }))
  sliceSales.forEach(s => flatItems.push({ type: 'sale', id: s.id, label: `Sale ${s.invoice_number} – ${(s.customer_name || 'Walk-in')}`, path: `/invoice/${s.id}` }))
  slicePurchases.forEach(p => {
    const billNo = p.type === 'gst' ? (p as any).invoice_number : (p as any).invoice_number || `#${p.id}`
    const supplier = (p as any).supplier_name || 'N/A'
    flatItems.push({ type: 'purchase', id: p.id, label: `Purchase ${billNo} – ${supplier}`, path: p.type === 'gst' ? `/purchases/${p.id}/edit-gst` : `/purchases/${p.id}/edit-simple` })
  })

  const handleSelect = (path: string) => {
    navigate(path)
    closeSearch()
  }

  // Arrow key navigation
  useEffect(() => {
    if (!open || flatItems.length === 0) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % flatItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + flatItems.length) % flatItems.length)
      } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault()
        handleSelect(flatItems[selectedIndex].path)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, flatItems, selectedIndex])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!user) return null
  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) closeSearch()
      }}
      role="dialog"
      aria-label="Global search"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, customers, sales, purchases…"
            className="flex-1 outline-none text-base"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : !q ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              Type to search products (name, SKU, barcode), customers, sales (invoice no.), or purchases (bill no., supplier).
              <div className="mt-2 text-xs text-gray-400">Press Ctrl+K or ⌘K anytime to open.</div>
            </div>
          ) : totalResults === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results for “{query}”</div>
          ) : (
            <>
              {sliceProducts.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> Products
                  </div>
                  {sliceProducts.map((p) => {
                    const idx = flatItems.findIndex(x => x.type === 'product' && x.id === p.id)
                    const selected = idx === selectedIndex
                    return (
                      <button
                        key={`p-${p.id}`}
                        type="button"
                        onClick={() => handleSelect(`/products/${p.id}/edit`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">{p.name}{p.sku ? ` (${p.sku})` : ''}</span>
                        {p.barcode && <span className="text-gray-400 text-xs shrink-0">{p.barcode}</span>}
                      </button>
                    )
                  })}
                  {filteredProducts.length > productLimit && (
                    <div className="px-3 py-1 text-xs text-gray-400">+{filteredProducts.length - productLimit} more</div>
                  )}
                </div>
              )}
              {sliceCustomers.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Customers
                  </div>
                  {sliceCustomers.map(c => {
                    const idx = flatItems.findIndex(x => x.type === 'customer' && x.id === c.id)
                    const selected = idx === selectedIndex
                    return (
                      <button
                        key={`c-${c.id}`}
                        type="button"
                        onClick={() => handleSelect('/customers')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">{c.name}</span>
                      </button>
                    )
                  })}
                  {filteredCustomers.length > customerLimit && (
                    <div className="px-3 py-1 text-xs text-gray-400">+{filteredCustomers.length - customerLimit} more</div>
                  )}
                </div>
              )}
              {sliceSales.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> Sales
                  </div>
                  {sliceSales.map(s => {
                    const idx = flatItems.findIndex(x => x.type === 'sale' && x.id === s.id)
                    const selected = idx === selectedIndex
                    return (
                      <button
                        key={`s-${s.id}`}
                        type="button"
                        onClick={() => handleSelect(`/invoice/${s.id}`)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">{s.invoice_number} – {s.customer_name || 'Walk-in'}</span>
                        <span className="text-gray-500 text-xs shrink-0">₹{(s.grand_total || 0).toFixed(0)}</span>
                      </button>
                    )
                  })}
                  {filteredSales.length > salesLimit && (
                    <div className="px-3 py-1 text-xs text-gray-400">+{filteredSales.length - salesLimit} more</div>
                  )}
                </div>
              )}
              {slicePurchases.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" /> Purchases
                  </div>
                  {slicePurchases.map(p => {
                    const idx = flatItems.findIndex(x => x.type === 'purchase' && x.id === p.id)
                    const selected = idx === selectedIndex
                    const billNo = p.type === 'gst' ? (p as any).invoice_number : (p as any).invoice_number || `#${p.id}`
                    const supplier = (p as any).supplier_name || 'N/A'
                    const total = p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
                    return (
                      <button
                        key={`purchase-${p.id}`}
                        type="button"
                        onClick={() => handleSelect(p.type === 'gst' ? `/purchases/${p.id}/edit-gst` : `/purchases/${p.id}/edit-simple`)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">{billNo} – {supplier}</span>
                        <span className="text-gray-500 text-xs shrink-0">₹{(total ?? 0).toFixed(0)}</span>
                      </button>
                    )
                  })}
                  {filteredPurchases.length > purchaseLimit && (
                    <div className="px-3 py-1 text-xs text-gray-400">+{filteredPurchases.length - purchaseLimit} more</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span>↑↓ Navigate</span>
          <span>Enter Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
