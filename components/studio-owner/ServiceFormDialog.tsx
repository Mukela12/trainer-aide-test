"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Service, ServiceType, ServiceDuration } from '@/lib/types/service';
import { cn } from '@/lib/utils/cn';
import { Clock, User, Users, UsersRound } from 'lucide-react';

interface ServiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  service?: Service | null; // If provided, we're editing; otherwise creating
}

const DURATIONS: ServiceDuration[] = [30, 45, 60, 75, 90];
const SERVICE_TYPES: { value: ServiceType; label: string; icon: typeof User }[] = [
  { value: '1-2-1', label: '1-on-1', icon: User },
  { value: 'duet', label: 'Duet', icon: Users },
  { value: 'group', label: 'Group', icon: UsersRound },
];

const PRESET_COLORS = [
  '#12229D', // Brand blue
  '#A71075', // Brand magenta
  '#F4B324', // Brand orange
  '#AB1D79', // Magenta variation
  '#0A1466', // Dark blue
  '#B8E6F0', // Cyan
];

export function ServiceFormDialog({ open, onClose, onSave, service }: ServiceFormDialogProps) {
  const isEditing = !!service;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30 as ServiceDuration,
    type: '1-2-1' as ServiceType,
    maxCapacity: 1,
    creditsRequired: 1,
    color: PRESET_COLORS[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        duration: service.duration as ServiceDuration,
        type: service.type,
        maxCapacity: service.maxCapacity,
        creditsRequired: service.creditsRequired,
        color: service.color,
      });
    } else {
      // Reset form when creating new
      setFormData({
        name: '',
        description: '',
        duration: 30,
        type: '1-2-1',
        maxCapacity: 1,
        creditsRequired: 1,
        color: PRESET_COLORS[0],
      });
    }
    setErrors({});
  }, [service, open]);

  // Auto-set maxCapacity based on type
  useEffect(() => {
    if (formData.type === '1-2-1') {
      setFormData((prev) => ({ ...prev, maxCapacity: 1 }));
    } else if (formData.type === 'duet') {
      setFormData((prev) => ({ ...prev, maxCapacity: 2 }));
    } else if (formData.type === 'group') {
      // Keep current value if it's between 2-5, otherwise default to 5
      if (formData.maxCapacity < 2 || formData.maxCapacity > 5) {
        setFormData((prev) => ({ ...prev, maxCapacity: 5 }));
      }
    }
  }, [formData.type]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.creditsRequired <= 0) {
      newErrors.creditsRequired = 'Credits must be greater than 0';
    }
    if (formData.maxCapacity <= 0) {
      newErrors.maxCapacity = 'Max capacity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const now = new Date().toISOString();
    const serviceData: Service = {
      id: service?.id || `service_${Date.now()}`,
      ...formData,
      isActive: service?.isActive ?? true,
      createdBy: service?.createdBy || 'user_owner_1', // Will be replaced with actual user ID
      assignedStudios: service?.assignedStudios || ['studio_1'],
      createdAt: service?.createdAt || now,
      updatedAt: now,
    };

    onSave(serviceData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {isEditing
              ? 'Update the service details below'
              : 'Create a new session type that trainers can book'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 30min PT Session"
              className={cn("mt-1", errors.name && "border-red-500")}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this service"
              rows={3}
              className={cn(
                "mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wondrous-primary dark:bg-gray-700 dark:text-gray-100",
                errors.description && "border-red-500"
              )}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Duration */}
          <div>
            <Label>Duration *</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {DURATIONS.map((duration) => (
                <Button
                  key={duration}
                  type="button"
                  variant={formData.duration === duration ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, duration })}
                  className={cn(
                    "flex items-center gap-1",
                    formData.duration === duration
                      ? "bg-wondrous-magenta hover:bg-wondrous-magenta-alt"
                      : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  <Clock size={14} />
                  {duration}min
                </Button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <Label>Session Type *</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {SERVICE_TYPES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={formData.type === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, type: value })}
                  className={cn(
                    "flex items-center gap-1",
                    formData.type === value
                      ? "bg-wondrous-magenta hover:bg-wondrous-magenta-alt"
                      : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Max Capacity */}
          <div>
            <Label htmlFor="maxCapacity">Max Capacity *</Label>
            {formData.type === 'group' ? (
              <Input
                id="maxCapacity"
                type="number"
                min={2}
                max={5}
                value={formData.maxCapacity}
                onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 2 })}
                className={cn("mt-1", errors.maxCapacity && "border-red-500")}
              />
            ) : (
              <Input
                id="maxCapacity"
                type="number"
                value={formData.maxCapacity}
                disabled
                className="mt-1 bg-gray-100 dark:bg-gray-700"
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.type === '1-2-1' && '1-on-1 sessions are limited to 1 person'}
              {formData.type === 'duet' && 'Duet sessions are limited to 2 people'}
              {formData.type === 'group' && 'Group sessions can have 2-5 people'}
            </p>
            {errors.maxCapacity && <p className="text-xs text-red-500 mt-1">{errors.maxCapacity}</p>}
          </div>

          {/* Credits Required */}
          <div>
            <Label htmlFor="creditsRequired">Credits Required *</Label>
            <Input
              id="creditsRequired"
              type="number"
              step="0.25"
              min="0.25"
              value={formData.creditsRequired}
              onChange={(e) => setFormData({ ...formData, creditsRequired: parseFloat(e.target.value) || 1 })}
              className={cn("mt-1", errors.creditsRequired && "border-red-500")}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              How many credits clients need to book this service
            </p>
            {errors.creditsRequired && <p className="text-xs text-red-500 mt-1">{errors.creditsRequired}</p>}
          </div>

          {/* Color */}
          <div>
            <Label htmlFor="color">Color *</Label>
            <div className="mt-2 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                      formData.color === color
                        ? "border-wondrous-magenta ring-2 ring-wondrous-magenta ring-offset-2 dark:ring-offset-gray-800"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{formData.color}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 sm:gap-2 pb-20 lg:pb-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-initial dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1 sm:flex-initial bg-wondrous-magenta hover:bg-wondrous-magenta-alt">
            {isEditing ? 'Save Changes' : 'Create Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
