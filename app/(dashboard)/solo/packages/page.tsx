'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Package,
  Trash2,
  Eye,
  EyeOff,
  Edit,
  PoundSterling,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { cn } from '@/lib/utils/cn';
import ContentHeader from '@/components/shared/ContentHeader';
import { usePackages, useCreatePackage, useDeletePackage } from '@/lib/hooks/use-packages';
import type { PackageData } from '@/lib/hooks/use-packages';

export default function PackagesPage() {
  const { currentUser } = useUserStore();
  const { data: packages = [], isLoading } = usePackages();
  const createPackage = useCreatePackage();
  const deletePackage = useDeletePackage();
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    deletePackage.mutate(id);
  };

  const perSessionPrice = formData.sessionCount && formData.priceInPounds
    ? (parseFloat(formData.priceInPounds) / parseInt(formData.sessionCount)).toFixed(2)
    : '0';

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Create bundles of sessions for clients to purchase"
        stats={[
          { label: 'packages', value: isLoading ? '...' : packages.length, color: 'primary' },
          { label: 'active', value: isLoading ? '...' : packages.filter(p => p.isActive).length, color: 'success' },
        ]}
        actions={
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus size={18} />
            <span className="hidden sm:inline">Create Package</span>
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Session Package</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., 10 Session Bundle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What's included in this package?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionCount">Number of Sessions *</Label>
                  <Input
                    id="sessionCount"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.sessionCount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sessionCount: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Total Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.priceInPounds}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priceInPounds: e.target.value }))
                    }
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
                <Label htmlFor="validityDays">Validity (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="30"
                  max="365"
                  value={formData.validityDays}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, validityDays: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">
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
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Show on public booking page
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPackage.isPending}>
                  {createPackage.isPending ? 'Creating...' : 'Create Package'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Packages List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Package className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
            <p className="text-lg font-medium mb-2 dark:text-gray-300">
              No packages yet
            </p>
            <p className="text-sm mb-4 dark:text-gray-400">
              Create your first session package to offer bundle discounts to clients
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2" size={16} />
              Create Your First Package
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(!pkg.isActive && 'opacity-60')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {pkg.isPublic ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Eye size={12} />
                          Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <EyeOff size={12} />
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pkg.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pkg.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {pkg.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sessions</span>
                    <span className="font-medium">{pkg.sessionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Validity</span>
                    <span className="font-medium">{pkg.validityDays} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Per Session</span>
                    <span className="font-medium">
                      £{((pkg.perSessionPriceCents || pkg.priceCents / pkg.sessionCount) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      £{(pkg.priceCents / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      {packages.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> Packages marked as &quot;Public&quot; will appear on your
            booking page. Clients can purchase them directly, or you can sell them
            manually from the client&apos;s profile.
          </p>
        </div>
      )}
    </div>
  );
}
