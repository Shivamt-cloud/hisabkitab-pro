/**
 * Barcode Scanner Component
 * Camera-based barcode scanner using ZXing library
 */

import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { X, Camera, AlertCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

const BarcodeScanner = ({ onScan, onClose, isOpen }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      return
    }

    if (isOpen && videoRef.current) {
      startScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isOpen])

  const startScanning = async () => {
    if (!videoRef.current) return

    try {
      setError(null)
      setScanning(true)

      // Create code reader instance
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader

      // Get available video input devices
      const videoInputDevices = await codeReader.listVideoInputDevices()

      if (videoInputDevices.length === 0) {
        setError('No camera found. Please connect a camera and try again.')
        setScanning(false)
        return
      }

      // Use the first available camera (or back camera on mobile)
      const selectedDeviceId = videoInputDevices.length > 1
        ? videoInputDevices.find(device => device.label.toLowerCase().includes('back'))?.deviceId || videoInputDevices[1].deviceId
        : videoInputDevices[0].deviceId

      // Start scanning
      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcode = result.getText()
            stopScanning()
            onScan(barcode)
          }

          if (err && !(err instanceof NotFoundException)) {
            console.error('Scanning error:', err)
            // Don't show error for NotFoundException as it's normal when scanning
            if (err.name !== 'NotFoundException') {
              setError('Error scanning barcode. Please try again.')
            }
          }
        }
      )
    } catch (err: any) {
      console.error('Error starting camera:', err)
      setError(err.message || 'Failed to access camera. Please check permissions.')
      setScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
      codeReaderRef.current = null
    }
    setScanning(false)
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Scan Barcode</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close Scanner"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-white text-lg mb-2">Camera Error</p>
              <p className="text-gray-300 text-sm mb-4">{error}</p>
              <button
                onClick={startScanning}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                muted
                autoPlay
              />
              {/* Scanning Overlay */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/50" />
                  {/* Scanning Frame */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-4 border-blue-500 rounded-lg">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  </div>
                  {/* Instructions */}
                  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center">
                    <p className="text-lg font-semibold mb-2">Position barcode within frame</p>
                    <p className="text-sm text-gray-300">The scanner will automatically detect the barcode</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600 text-center">
            <p className="mb-2">
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Scanning...
                </span>
              ) : (
                'Camera is ready'
              )}
            </p>
            <p className="text-xs text-gray-500">
              Make sure the barcode is well-lit and clearly visible
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner


