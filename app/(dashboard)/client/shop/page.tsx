'use client';

import { useState } from 'react';
import ContentHeader from '@/components/shared/ContentHeader';
import { PackageCard } from '@/components/client/shop/PackageCard';
import { OfferCard } from '@/components/client/shop/OfferCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Gift, ShoppingBag, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { useShopPackages, useShopOffers, useClaimShopItem } from '@/lib/hooks/use-shop';
import type { ShopPackage, ShopOffer } from '@/lib/hooks/use-shop';

export default function ClientShopPage() {
  const { data: packages = [], isLoading: packagesLoading } = useShopPackages();
  const { data: offers = [], isLoading: offersLoading } = useShopOffers();
  const claimMutation = useClaimShopItem();
  const loading = packagesLoading || offersLoading;
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClaimPackage = async (packageId: string) => {
    setClaimingId(packageId);
    try {
      const data = await claimMutation.mutateAsync({ type: 'package', id: packageId });
      toast({ title: 'Success!', description: data.message });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim package',
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimOffer = async (offerId: string) => {
    setClaimingId(offerId);
    try {
      const data = await claimMutation.mutateAsync({ type: 'offer', id: offerId });
      toast({ title: 'Success!', description: data.message });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim offer',
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
