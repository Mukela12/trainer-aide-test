'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Clock, PoundSterling, Users } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

export interface ServiceDraft {
  id: string;
  name: string;
  description: string;
  duration: number;
  type: '1-2-1' | 'duet' | 'group';
  maxCapacity: number;
  priceInPounds: string;
  isIntro: boolean;
  isPublic: boolean;
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const SERVICE_TEMPLATES = [
  {
    name: 'Free Intro Session',
    description: 'A complimentary consultation to discuss your fitness goals and see if we\'re a good fit.',
    duration: 30,
    type: '1-2-1' as const,
    priceInPounds: '0',
    isIntro: true,
  },
  {
    name: '1-2-1 PT Session',
    description: 'Personalized training session focused on your specific goals.',
    duration: 60,
    type: '1-2-1' as const,
    priceInPounds: '50',
    isIntro: false,
  },
  {
    name: 'Partner Training',
    description: 'Train with a friend or partner. Split the cost, double the motivation!',
    duration: 60,
    type: 'duet' as const,
    priceInPounds: '70',
    isIntro: false,
  },
];

interface Props {
  userId: string;
  services: ServiceDraft[];
  onServicesChange: (services: ServiceDraft[]) => void;
}

export function ServiceSetupForm({ userId, services, onServicesChange }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState<ServiceDraft>({
    id: '',
    name: '',
    description: '',
    duration: 60,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '',
    isIntro: false,
    isPublic: true,
  });

  // Load existing services on mount
  useEffect(() => {
    const loadServices = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('ta_services')
        .select('*')
        .eq('created_by', userId);

      if (data && data.length > 0) {
        onServicesChange(
          data.map((s: {
            id: string;
            name: string;
            description: string | null;
            duration: number;
            type: '1-2-1' | 'duet' | 'group';
            max_capacity: number;
            price_cents: number | null;
            is_intro_session: boolean | null;
            is_public: boolean | null;
          }) => ({
            id: s.id,
            name: s.name,
            description: s.description || '',
            duration: s.duration,
            type: s.type,
            maxCapacity: s.max_capacity,
            priceInPounds: s.price_cents ? (s.price_cents / 100).toString() : '0',
            isIntro: s.is_intro_session || false,
            isPublic: s.is_public !== false,
          }))
        );
      }
    };
    loadServices();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTemplateService = (template: typeof SERVICE_TEMPLATES[0]) => {
    const newSvc: ServiceDraft = {
      id: `temp-${Date.now()}`,
      name: template.name,
      description: template.description,
      duration: template.duration,
      type: template.type,
      maxCapacity: template.type === '1-2-1' ? 1 : template.type === 'duet' ? 2 : 10,
      priceInPounds: template.priceInPounds,
      isIntro: template.isIntro,
      isPublic: true,
    };
    onServicesChange([...services, newSvc]);
  };

  const addCustomService = () => {
    if (!newService.name.trim()) return;

    const svc: ServiceDraft = {
      ...newService,
      id: `temp-${Date.now()}`,
      maxCapacity: newService.type === '1-2-1' ? 1 : newService.type === 'duet' ? 2 : newService.maxCapacity,
    };
    onServicesChange([...services, svc]);
    setNewService({
      id: '',
      name: '',
      description: '',
      duration: 60,
      type: '1-2-1',
      maxCapacity: 1,
      priceInPounds: '',
      isIntro: false,
      isPublic: true,
    });
    setShowAddForm(false);
  };

  const removeService = (id: string) => {
    onServicesChange(services.filter((s) => s.id !== id));
  };

  return (
    <>
      {/* Quick Add Templates */}
      {services.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Click to add common service types
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {SERVICE_TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  onClick={() => addTemplateService(template)}
                  className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-wondrous-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {template.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {template.duration} min •{' '}
                    {template.priceInPounds === '0' ? 'Free' : `£${template.priceInPounds}`}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      {services.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your Services ({services.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-2" size={16} />
              Add Service
            </Button>
          </div>

          <div className="space-y-3">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {service.name}
                        </h3>
                        {service.isIntro && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Intro
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-500 mb-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {service.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <PoundSterling size={14} />
                          {service.priceInPounds === '0' || !service.priceInPounds
                            ? 'Free'
                            : `£${service.priceInPounds}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {service.type === '1-2-1'
                            ? '1-2-1'
                            : service.type === 'duet'
                            ? 'Duet (2)'
                            : `Group (${service.maxCapacity})`}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(service.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Service Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                value={newService.name}
                onChange={(e) =>
                  setNewService((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., HIIT Session"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDesc">Description</Label>
              <Textarea
                id="serviceDesc"
                value={newService.description}
                onChange={(e) =>
                  setNewService((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="What does this session include?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() =>
                        setNewService((prev) => ({ ...prev, duration: dur }))
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        newService.duration === dur
                          ? 'bg-wondrous-blue text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      )}
                    >
                      {dur} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Session Type</Label>
                <div className="flex flex-wrap gap-2">
                  {(['1-2-1', 'duet', 'group'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setNewService((prev) => ({ ...prev, type }))
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        newService.type === type
                          ? 'bg-wondrous-blue text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      )}
                    >
                      {type === '1-2-1' ? '1-2-1' : type === 'duet' ? 'Duet' : 'Group'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (£)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newService.priceInPounds}
                  onChange={(e) =>
                    setNewService((prev) => ({ ...prev, priceInPounds: e.target.value }))
                  }
                  placeholder="0 for free"
                />
              </div>

              {newService.type === 'group' && (
                <div className="space-y-2">
                  <Label htmlFor="capacity">Max Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="3"
                    max="50"
                    value={newService.maxCapacity}
                    onChange={(e) =>
                      setNewService((prev) => ({
                        ...prev,
                        maxCapacity: parseInt(e.target.value) || 10,
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={addCustomService} disabled={!newService.name.trim()}>
                Add Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
