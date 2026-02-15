'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, PoundSterling, Users } from 'lucide-react';
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
  isActive: boolean;
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const DEFAULT_SERVICE_SET: Omit<ServiceDraft, 'id'>[] = [
  // 1-2-1 sessions
  {
    name: 'Free Intro Session',
    description: 'A complimentary consultation to discuss goals and see if we\'re a good fit.',
    duration: 30,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '0',
    isIntro: true,
    isPublic: true,
    isActive: true,
  },
  {
    name: '30-Minute PT',
    description: 'A focused personal training session.',
    duration: 30,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '30',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  {
    name: '45-Minute PT',
    description: 'A personal training session with warm-up and cool-down.',
    duration: 45,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '40',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  {
    name: '60-Minute PT',
    description: 'A full personal training session.',
    duration: 60,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '50',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  {
    name: '90-Minute PT',
    description: 'An extended personal training session.',
    duration: 90,
    type: '1-2-1',
    maxCapacity: 1,
    priceInPounds: '70',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  // Duet sessions
  {
    name: 'Duet Session (45 min)',
    description: 'Semi-private partner training session for two.',
    duration: 45,
    type: 'duet',
    maxCapacity: 2,
    priceInPounds: '60',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  {
    name: 'Duet Session (60 min)',
    description: 'Extended partner training session for two.',
    duration: 60,
    type: 'duet',
    maxCapacity: 2,
    priceInPounds: '70',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  // Group sessions
  {
    name: 'Group Training (45 min)',
    description: 'Small group training session.',
    duration: 45,
    type: 'group',
    maxCapacity: 8,
    priceInPounds: '15',
    isIntro: false,
    isPublic: true,
    isActive: true,
  },
  {
    name: 'Group Training (60 min)',
    description: 'Extended small group training session.',
    duration: 60,
    type: 'group',
    maxCapacity: 10,
    priceInPounds: '20',
    isIntro: false,
    isPublic: true,
    isActive: true,
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
    isActive: true,
  });

  // Load existing services or pre-populate defaults
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
            is_active: boolean | null;
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
            isActive: s.is_active !== false,
          }))
        );
      } else {
        // Pre-populate with full service set
        onServicesChange(
          DEFAULT_SERVICE_SET.map((s, i: number) => ({
            ...s,
            id: `default-${i}`,
          }))
        );
      }
    };
    loadServices();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleService = (id: string) => {
    onServicesChange(
      services.map((s: ServiceDraft) =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      )
    );
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
      isActive: true,
    });
    setShowAddForm(false);
  };

  const activeCount = services.filter((s: ServiceDraft) => s.isActive).length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activeCount} of {services.length} active
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-2" size={16} />
          Add Custom
        </Button>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {services.map((service) => (
          <Card
            key={service.id}
            className={cn(
              'transition-opacity',
              !service.isActive && 'opacity-50'
            )}
          >
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
                <button
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-1',
                    service.isActive ? 'bg-wondrous-blue' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      service.isActive ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Custom Service Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Add Custom Service
            </h3>

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
