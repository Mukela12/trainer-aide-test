'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Calendar, Users, FileText, Loader2 } from 'lucide-react';

interface TrainerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    staff_type: string;
    is_onboarded: boolean;
    created_at: string;
  } | null;
}

interface TrainerStats {
  totalClients: number;
  totalBookings: number;
  totalTemplates: number;
  upcomingBookings: number;
}

export function TrainerProfileDialog({ open, onOpenChange, trainer }: TrainerProfileDialogProps) {
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && trainer) {
      loadTrainerStats();
    }
  }, [open, trainer]);

  const loadTrainerStats = async () => {
    if (!trainer) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/trainers/${trainer.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Set default stats if endpoint doesn't exist
        setStats({
          totalClients: 0,
          totalBookings: 0,
          totalTemplates: 0,
          upcomingBookings: 0,
        });
      }
    } catch (error) {
      console.error('Error loading trainer stats:', error);
      setStats({
        totalClients: 0,
        totalBookings: 0,
        totalTemplates: 0,
        upcomingBookings: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!trainer) return null;

  const joinedDate = new Date(trainer.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">Trainer Profile</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Profile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-wondrous-cyan flex items-center justify-center">
              <span className="text-2xl font-semibold text-wondrous-dark-blue">
                {trainer.first_name.charAt(0)}{trainer.last_name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {trainer.first_name} {trainer.last_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {trainer.staff_type}
              </p>
              <Badge
                variant={trainer.is_onboarded ? 'default' : 'secondary'}
                className="mt-1 text-xs"
              >
                {trainer.is_onboarded ? 'Active' : 'Pending Setup'}
              </Badge>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{trainer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">Joined {joinedDate}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Activity Overview
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalClients}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Clients</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalBookings}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Sessions</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.totalTemplates}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Templates</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stats.upcomingBookings}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upcoming</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="border-t dark:border-gray-700 pt-4 mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 dark:border-gray-600 dark:text-gray-300"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
              onClick={() => {
                // Could open email client or messaging
                window.location.href = `mailto:${trainer.email}`;
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
