'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Download, QrCode, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

interface PublicBookingLinkProps {
  businessSlug: string;
  businessName?: string | null;
  className?: string;
}

/**
 * PublicBookingLink component
 * Shows the public booking link with copy and QR code functionality
 */
export function PublicBookingLink({
  businessSlug,
  businessName,
  className = '',
}: PublicBookingLinkProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://allwondrous.com';
  const bookingUrl = `${baseUrl}/book/${businessSlug}`;

  // Generate QR code when showQR is true
  useEffect(() => {
    if (showQR && businessSlug) {
      generateQRCode();
    }
  }, [showQR, businessSlug]);

  const generateQRCode = async () => {
    try {
      // Generate as data URL for display and download
      const dataUrl = await QRCode.toDataURL(bookingUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `${businessSlug}-booking-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleOpenLink = () => {
    window.open(bookingUrl, '_blank');
  };

  if (!businessSlug) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wondrous-blue-light rounded-lg flex items-center justify-center">
              <QrCode className="text-wondrous-dark-blue" size={20} />
            </div>
            <div>
              <CardTitle className="text-base">Public Booking Link</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share with clients to book sessions
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link with copy button */}
        <div className="flex gap-2">
          <Input
            value={bookingUrl}
            readOnly
            className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy link"
          >
            {copied ? (
              <Check className="text-green-500" size={16} />
            ) : (
              <Copy size={16} />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleOpenLink}
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </Button>
        </div>

        {/* QR Code toggle button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowQR(!showQR)}
        >
          <QrCode className="mr-2" size={16} />
          {showQR ? 'Hide QR Code' : 'Show QR Code'}
        </Button>

        {/* QR Code display */}
        {showQR && qrDataUrl && (
          <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="bg-white p-3 rounded-lg">
              <img
                src={qrDataUrl}
                alt={`QR code for ${businessName || businessSlug} booking`}
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Scan to book with {businessName || businessSlug}
            </p>
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="w-full"
            >
              <Download className="mr-2" size={16} />
              Download QR Code
            </Button>
          </div>
        )}

        {/* Hidden canvas for QR generation */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
