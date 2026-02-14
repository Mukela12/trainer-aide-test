"use client";

import { useState } from 'react';
import { useServices, useAddService, useUpdateService } from '@/lib/hooks/use-services';
import { useCreditBundles, useSaveCreditBundle, useDeleteCreditBundle } from '@/lib/hooks/use-credit-bundles';
import { useOffers, useSaveOffer, useDeleteOffer } from '@/lib/hooks/use-offers';
import { useUserStore } from '@/lib/stores/user-store';
import { Service, ServiceType } from '@/lib/types/service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { ServiceFormDialog } from '@/components/studio-owner/ServiceFormDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Plus,
  Edit,
  Power,
  PowerOff,
  Users,
  User,
  UsersRound,
  Package,
  CreditCard,
  Gift,
  Trash2,
  X,
} from 'lucide-react';
import ContentHeader from '@/components/shared/ContentHeader';
import type { CreditBundle } from '@/lib/types/credit-bundle';
import type { Offer } from '@/lib/hooks/use-offers';

// Helper functions
const getTypeIcon = (type: ServiceType) => {
  switch (type) {
    case '1-2-1': return <User size={16} />;
    case 'duet': return <Users size={16} />;
    case 'group': return <UsersRound size={16} />;
  }
};

const getTypeLabel = (type: ServiceType) => {
  switch (type) {
    case '1-2-1': return '1-on-1';
    case 'duet': return 'Duet';
    case 'group': return 'Group';
  }
};

export default function ServicesPage() {
  const { data: services = [] } = useServices(undefined, false);
  const addServiceMutation = useAddService();
  const updateServiceMutation = useUpdateService();
  const { currentUser } = useUserStore();
  const [activeTab, setActiveTab] = useState('services');

  // Services state
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Packages state
  const { data: bundles = [], isLoading: bundlesLoading } = useCreditBundles();
  const saveBundleMutation = useSaveCreditBundle();
  const deleteBundleMutation = useDeleteCreditBundle();
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<CreditBundle | null>(null);
  const [bundleForm, setBundleForm] = useState({
    name: '',
    credit_count: 10,
    total_price: 100,
    expiry_days: 90,
  });

  // Offers state
  const { data: offers = [], isLoading: offersLoading } = useOffers();
  const saveOfferMutation = useSaveOffer();
  const deleteOfferMutation = useDeleteOffer();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    payment_amount: 0,
    max_referrals: 10,
    credits: 1,
    expiry_days: 90,
    is_gift: false,
  });

  const activeServices = services.filter(s => s.isActive);
  const inactiveServices = services.filter(s => !s.isActive);

  // Service handlers
  const toggleServiceStatus = (serviceId: string, currentStatus: boolean) => {
    updateServiceMutation.mutate({ id: serviceId, updates: { isActive: !currentStatus } });
  };

  const handleAddService = () => {
    setSelectedService(null);
    setIsServiceDialogOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = (service: Service) => {
    const serviceWithUser = {
      ...service,
      createdBy: service.createdBy === 'user_owner_1' ? currentUser.id : service.createdBy,
    };

    if (selectedService) {
      updateServiceMutation.mutate({ id: serviceWithUser.id, updates: serviceWithUser });
    } else {
      addServiceMutation.mutate(serviceWithUser);
    }

    setIsServiceDialogOpen(false);
    setSelectedService(null);
  };

  // Bundle handlers
  const openBundleModal = (bundle?: CreditBundle) => {
    if (bundle) {
      setEditingBundle(bundle);
      setBundleForm({
        name: bundle.name,
        credit_count: bundle.credit_count,
        total_price: bundle.total_price,
        expiry_days: bundle.expiry_days || 90,
      });
    } else {
      setEditingBundle(null);
      setBundleForm({ name: '', credit_count: 10, total_price: 100, expiry_days: 90 });
    }
    setShowBundleModal(true);
  };

  const handleSaveBundle = async () => {
    try {
      await saveBundleMutation.mutateAsync(
        editingBundle ? { id: editingBundle.id, ...bundleForm } : bundleForm
      );
      setShowBundleModal(false);
    } catch {
      // error handled by mutation
    }
  };

  const handleDeleteBundle = (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    deleteBundleMutation.mutate(bundleId);
  };

  // Offer handlers
  const openOfferModal = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setOfferForm({
        title: offer.title,
        description: offer.description || '',
        payment_amount: offer.payment_amount,
        max_referrals: offer.max_referrals || 10,
        credits: offer.credits,
        expiry_days: offer.expiry_days || 90,
        is_gift: offer.is_gift,
      });
    } else {
      setEditingOffer(null);
      setOfferForm({
        title: '',
        description: '',
        payment_amount: 0,
        max_referrals: 10,
        credits: 1,
        expiry_days: 90,
        is_gift: false,
      });
    }
    setShowOfferModal(true);
  };

  const handleSaveOffer = async () => {
    try {
      await saveOfferMutation.mutateAsync(
        editingOffer ? { id: editingOffer.id, ...offerForm } : offerForm
      );
      setShowOfferModal(false);
    } catch {
      // error handled by mutation
    }
  };

  const handleDeleteOffer = (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    deleteOfferMutation.mutate(offerId);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Manage services, packages, memberships, and promotional offers"
        stats={[
          { label: 'services', value: services.length, color: 'primary' },
          { label: 'packages', value: bundles.length, color: 'success' },
          { label: 'offers', value: offers.length, color: 'magenta' },
        ]}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3 gap-1">
          <TabsTrigger value="services" className="gap-2">
            <Clock size={16} className="hidden sm:inline" />
            Services
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package size={16} className="hidden sm:inline" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-2">
            <Gift size={16} className="hidden sm:inline" />
            Offers
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Session Types</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Define the types of sessions you offer</p>
            </div>
            <Button onClick={handleAddService} className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">
              <Plus size={18} />
              <span className="hidden sm:inline">Add Service</span>
            </Button>
          </div>

          {activeServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeServices.map((service) => (
                <Card key={service.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <CardTitle className="text-base dark:text-gray-100">{service.name}</CardTitle>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{service.description}</p>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Duration</span>
                        <Badge variant="outline">{service.duration} min</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Type</span>
                        <Badge variant="outline">{getTypeIcon(service.type)}<span className="ml-1">{getTypeLabel(service.type)}</span></Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Credits</span>
                        <span className="font-medium text-wondrous-magenta">{service.creditsRequired}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditService(service)} className="flex-1">
                        <Edit size={14} className="mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleServiceStatus(service.id, service.isActive)} className="flex-1 text-orange-600">
                        <PowerOff size={14} className="mr-1" />Disable
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock} title="No active services" description="Create your first service to get started" actionLabel="Add Service" onAction={handleAddService} />
          )}

          {inactiveServices.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Inactive Services ({inactiveServices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveServices.map((service) => (
                  <Card key={service.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                        <CardTitle className="text-base">{service.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">Inactive</Badge>
                    </CardHeader>
                    <CardContent className="py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleServiceStatus(service.id, service.isActive)} className="w-full text-green-600">
                        <Power size={14} className="mr-1" />Enable
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Credit Packages</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create bundles of credits for clients to purchase</p>
            </div>
            <Button onClick={() => openBundleModal()} className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">
              <Plus size={18} />
              <span className="hidden sm:inline">Create Package</span>
            </Button>
          </div>

          {bundlesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bundles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map((bundle) => (
                <Card key={bundle.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Package className="w-5 h-5 text-wondrous-blue" />
                      <CardTitle className="text-base dark:text-gray-100">{bundle.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Credits</span>
                        <span className="font-semibold">{bundle.credit_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Price</span>
                        <span className="font-semibold text-wondrous-magenta">${bundle.total_price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Per Credit</span>
                        <span className="text-gray-500">${bundle.price_per_credit.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Expires</span>
                        <span className="text-gray-500">{bundle.expiry_days || 90} days</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openBundleModal(bundle)} className="flex-1">
                        <Edit size={14} className="mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteBundle(bundle.id)} className="flex-1 text-red-600">
                        <Trash2 size={14} className="mr-1" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Package} title="No packages yet" description="Create your first credit package to offer bundled deals" actionLabel="Create Package" onAction={() => openBundleModal()} />
          )}
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Promotional Offers</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create special offers and referral incentives</p>
            </div>
            <Button onClick={() => openOfferModal()} className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">
              <Plus size={18} />
              <span className="hidden sm:inline">Create Offer</span>
            </Button>
          </div>

          {offersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : offers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Gift className="w-5 h-5 text-wondrous-magenta" />
                      <CardTitle className="text-base dark:text-gray-100">{offer.title}</CardTitle>
                    </div>
                    {offer.is_gift && <Badge className="bg-purple-100 text-purple-700">Gift</Badge>}
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Credits</span>
                        <span className="font-semibold">{offer.credits}</span>
                      </div>
                      {offer.payment_amount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Price</span>
                          <span className="font-semibold">${offer.payment_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Redemptions</span>
                        <span className="text-gray-500">{offer.current_referrals}/{offer.max_referrals || 'Unlimited'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                        <Badge variant={offer.is_active ? 'default' : 'secondary'}>{offer.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openOfferModal(offer)} className="flex-1">
                        <Edit size={14} className="mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteOffer(offer.id)} className="flex-1 text-red-600">
                        <Trash2 size={14} className="mr-1" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Gift} title="No offers yet" description="Create your first promotional offer" actionLabel="Create Offer" onAction={() => openOfferModal()} />
          )}
        </TabsContent>
      </Tabs>

      {/* Service Form Dialog */}
      <ServiceFormDialog
        open={isServiceDialogOpen}
        onClose={() => {
          setIsServiceDialogOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSaveService}
        service={selectedService}
      />

      {/* Bundle Modal */}
      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBundleModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setShowBundleModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">{editingBundle ? 'Edit Package' : 'Create Package'}</h2>
            <div className="space-y-4">
              <div>
                <Label>Package Name</Label>
                <Input value={bundleForm.name} onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })} placeholder="e.g., Starter Pack" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Credits</Label>
                  <Input type="number" value={bundleForm.credit_count} onChange={(e) => setBundleForm({ ...bundleForm, credit_count: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Total Price ($)</Label>
                  <Input type="number" step="0.01" value={bundleForm.total_price} onChange={(e) => setBundleForm({ ...bundleForm, total_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Expiry Days</Label>
                <Input type="number" value={bundleForm.expiry_days} onChange={(e) => setBundleForm({ ...bundleForm, expiry_days: parseInt(e.target.value) || 90 })} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowBundleModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveBundle} className="flex-1 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">{editingBundle ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOfferModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button onClick={() => setShowOfferModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">{editingOffer ? 'Edit Offer' : 'Create Offer'}</h2>
            <div className="space-y-4">
              <div>
                <Label>Offer Title</Label>
                <Input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="e.g., First Session Free" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={offerForm.description} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Credits Awarded</Label>
                  <Input type="number" value={offerForm.credits} onChange={(e) => setOfferForm({ ...offerForm, credits: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Price ($)</Label>
                  <Input type="number" step="0.01" value={offerForm.payment_amount} onChange={(e) => setOfferForm({ ...offerForm, payment_amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Redemptions</Label>
                  <Input type="number" value={offerForm.max_referrals} onChange={(e) => setOfferForm({ ...offerForm, max_referrals: parseInt(e.target.value) || 10 })} />
                </div>
                <div>
                  <Label>Expiry Days</Label>
                  <Input type="number" value={offerForm.expiry_days} onChange={(e) => setOfferForm({ ...offerForm, expiry_days: parseInt(e.target.value) || 90 })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_gift" checked={offerForm.is_gift} onChange={(e) => setOfferForm({ ...offerForm, is_gift: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="is_gift">This is a gift (no payment required)</Label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowOfferModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveOffer} className="flex-1 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">{editingOffer ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
