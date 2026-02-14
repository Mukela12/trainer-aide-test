'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Search, Package, Plus, MoreVertical, Users, CreditCard, Loader2 } from 'lucide-react';
import ContentHeader from '@/components/shared/ContentHeader';
import { useWrappedPackages, useCreatePackage } from '@/lib/hooks/use-packages';
import type { PackageData, ClientPackage } from '@/lib/hooks/use-packages';

export default function PackagesPage() {
  const { data, isLoading: loading } = useWrappedPackages();
  const packages: PackageData[] = data?.packages || [];
  const clientPackages: ClientPackage[] = data?.clientPackages || [];
  const createPackage = useCreatePackage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sessionCount: '10',
    priceInPounds: '360',
    validityDays: '90',
    isPublic: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sessionCount || !formData.priceInPounds) return;

    try {
      await createPackage.mutateAsync({
        name: formData.name,
        description: formData.description || null,
        sessionCount: parseInt(formData.sessionCount),
        priceCents: Math.round(parseFloat(formData.priceInPounds) * 100),
        validityDays: parseInt(formData.validityDays) || 90,
        isPublic: formData.isPublic,
      });

      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        sessionCount: '10',
        priceInPounds: '360',
        validityDays: '90',
        isPublic: true,
      });
    } catch {
      // error handled by mutation state
    }
  };

  const perSessionPrice = formData.sessionCount && formData.priceInPounds
    ? (parseFloat(formData.priceInPounds) / parseInt(formData.sessionCount)).toFixed(2)
    : '0';

  const filteredPackages = packages.filter((pkg) => {
    const name = pkg.name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query);
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Create and manage training packages for your clients"
        stats={[
          { label: 'packages', value: loading ? '...' : packages.length, color: 'primary' },
          { label: 'active', value: loading ? '...' : packages.filter(p => p.isActive).length, color: 'success' },
        ]}
        actions={
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Package</span>
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-6 lg:mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {packages.filter(p => p.isActive).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {clientPackages.reduce((sum, cp) => sum + cp.creditsRemaining, 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Credits Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {clientPackages.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Client Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Package className="text-orange-600 dark:text-orange-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {packages.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Templates */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Package Templates
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading packages...</div>
        ) : filteredPackages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg dark:text-gray-100">
                        {pkg.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {pkg.sessionCount} session{pkg.sessionCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreVertical size={16} className="text-gray-400" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatPrice(pkg.priceCents)}
                      </span>
                      <Badge
                        variant={pkg.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {pkg.validityDays && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Valid for {pkg.validityDays} days
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs dark:border-gray-600 dark:text-gray-300"
                    >
                      Edit Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title={searchQuery ? 'No packages found' : 'No packages yet'}
            description={
              searchQuery
                ? 'Try adjusting your search criteria'
                : 'Create your first training package'
            }
            actionLabel={!searchQuery ? 'Create Package' : undefined}
            onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
          />
        )}
      </div>

      {/* Client Packages (if any) */}
      {clientPackages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Client Packages
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Package
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Credits
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientPackages.map((cp) => (
                  <tr key={cp.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {cp.clientName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {cp.packageName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {cp.creditsRemaining}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        /{cp.creditsTotal}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {cp.expiresAt
                        ? new Date(cp.expiresAt).toLocaleDateString()
                        : 'No expiry'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Package Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Create Session Package</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="dark:text-gray-200">Package Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., 10 Session Bundle"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="dark:text-gray-200">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="What's included in this package?"
                rows={2}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionCount" className="dark:text-gray-200">Number of Sessions *</Label>
                <Input
                  id="sessionCount"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.sessionCount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sessionCount: e.target.value }))
                  }
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="dark:text-gray-200">Total Price (£) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceInPounds}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, priceInPounds: e.target.value }))
                  }
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Price per session preview */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>£{perSessionPrice}</strong> per session
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validityDays" className="dark:text-gray-200">Validity (Days)</Label>
              <Input
                id="validityDays"
                type="number"
                min="30"
                max="365"
                value={formData.validityDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, validityDays: e.target.value }))
                }
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Credits expire {formData.validityDays || 90} days after purchase
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <Label htmlFor="isPublic" className="cursor-pointer dark:text-gray-200">
                Show on public booking page
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="dark:border-gray-600 dark:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPackage.isPending}
                className="bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
              >
                {createPackage.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Package'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
