'use client';

import { useState, useEffect } from 'react';
import ContentHeader from '@/components/shared/ContentHeader';
import { PackageCard } from '@/components/client/shop/PackageCard';
import { OfferCard } from '@/components/client/shop/OfferCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Gift, ShoppingBag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShopPackage {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  perSessionPriceCents: number | null;
  savingsPercent: number | null;
  isFree: boolean;
}

interface ShopOffer {
  id: string;
  title: string;
  description: string | null;
  paymentAmount: number;
  currency: string;
  credits: number;
  expiryDays: number | null;
  expiresAt: string | null;
  remainingSpots: number | null;
  isGift: boolean;
  isFree: boolean;
}

export default function ClientShopPage() {
  const [packages, setPackages] = useState<ShopPackage[]>([]);
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchShopItems();
  }, []);

  const fetchShopItems = async () => {
    setLoading(true);
    try {
      const [packagesRes, offersRes] = await Promise.all([
        fetch('/api/client/shop/packages'),
        fetch('/api/client/shop/offers'),
      ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.packages || []);
      }

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error('Error fetching shop items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shop items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPackage = async (packageId: string) => {
    setClaimingId(packageId);
    try {
      const res = await fetch('/api/client/shop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'package', id: packageId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success!',
          description: data.message,
        });
        // Refresh the shop items
        fetchShopItems();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to claim package',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to claim package',
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimOffer = async (offerId: string) => {
    setClaimingId(offerId);
    try {
      const res = await fetch('/api/client/shop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', id: offerId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success!',
          description: data.message,
        });
        // Refresh the shop items
        fetchShopItems();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to claim offer',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to claim offer',
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const freePackages = packages.filter((p) => p.isFree);
  const paidPackages = packages.filter((p) => !p.isFree);
  const freeOffers = offers.filter((o) => o.isFree);
  const paidOffers = offers.filter((o) => !o.isFree);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Shop</h1>
        <ContentHeader
          context="Browse packages and special offers from your studio"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const hasItems = packages.length > 0 || offers.length > 0;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Shop</h1>
      <ContentHeader
        context="Browse packages and special offers from your studio"
        stats={[
          { label: 'packages', value: packages.length, color: 'primary' },
          { label: 'offers', value: offers.length, color: 'magenta' },
        ]}
      />

      {!hasItems ? (
        <Card className="p-8 text-center">
          <ShoppingBag className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No items available
          </p>
          <p className="text-sm text-gray-500">
            Check back later for packages and offers from your studio
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="packages">
              <Package size={14} className="mr-1.5" />
              Packages ({packages.length})
            </TabsTrigger>
            <TabsTrigger value="offers">
              <Gift size={14} className="mr-1.5" />
              Offers ({offers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            {/* Free Items Section */}
            {(freePackages.length > 0 || freeOffers.length > 0) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Free Items
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freePackages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      {...pkg}
                      onClaim={handleClaimPackage}
                      isLoading={claimingId === pkg.id}
                    />
                  ))}
                  {freeOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      {...offer}
                      onClaim={handleClaimOffer}
                      isLoading={claimingId === offer.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paid Items Section */}
            {(paidPackages.length > 0 || paidOffers.length > 0) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Session Packages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paidPackages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      {...pkg}
                      onClaim={handleClaimPackage}
                      isLoading={claimingId === pkg.id}
                    />
                  ))}
                  {paidOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      {...offer}
                      onClaim={handleClaimOffer}
                      isLoading={claimingId === offer.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="packages">
            {packages.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">No packages available</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    {...pkg}
                    onClaim={handleClaimPackage}
                    isLoading={claimingId === pkg.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers">
            {offers.length === 0 ? (
              <Card className="p-8 text-center">
                <Gift className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">No offers available</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    {...offer}
                    onClaim={handleClaimOffer}
                    isLoading={claimingId === offer.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
