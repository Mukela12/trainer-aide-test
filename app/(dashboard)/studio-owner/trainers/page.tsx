'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { Search, Users, Mail, UserPlus, MoreVertical } from 'lucide-react';
import { InviteTrainerDialog } from '@/components/studio-owner/InviteTrainerDialog';
import { TrainerProfileDialog } from '@/components/studio-owner/TrainerProfileDialog';
import { AssignTemplateDialog } from '@/components/studio-owner/AssignTemplateDialog';
import ContentHeader from '@/components/shared/ContentHeader';

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  staff_type: string;
  is_onboarded: boolean;
  created_at: string;
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await fetch('/api/trainers');
        if (!response.ok) {
          throw new Error('Failed to fetch trainers');
        }
        const data = await response.json();
        setTrainers(data.trainers || []);
      } catch (error) {
        console.error('Error fetching trainers:', error);
        setTrainers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainers();
  }, []);

  const filteredTrainers = trainers.filter((trainer) => {
    const fullName = `${trainer.first_name} ${trainer.last_name}`.toLowerCase();
    const email = trainer.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Manage your studio trainers and their assignments"
        stats={[
          { label: 'trainers', value: loading ? '...' : trainers.length, color: 'primary' },
          { label: 'onboarded', value: loading ? '...' : trainers.filter(t => t.is_onboarded).length, color: 'success' },
        ]}
        actions={
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
          >
            <UserPlus size={20} />
            <span className="hidden sm:inline">Invite Trainer</span>
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-6 lg:mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search trainers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Trainers List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading trainers...</div>
      ) : filteredTrainers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredTrainers.map((trainer) => (
            <Card key={trainer.id} className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-wondrous-cyan flex items-center justify-center">
                      <span className="text-lg font-semibold text-wondrous-dark-blue">
                        {trainer.first_name.charAt(0)}{trainer.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base lg:text-lg dark:text-gray-100">
                        {trainer.first_name} {trainer.last_name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {trainer.staff_type}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="p-1">
                    <MoreVertical size={16} className="text-gray-400" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail size={14} className="flex-shrink-0" />
                    <span className="truncate">{trainer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={trainer.is_onboarded ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {trainer.is_onboarded ? 'Active' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t dark:border-gray-700 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs dark:border-gray-600 dark:text-gray-300"
                    onClick={() => {
                      setSelectedTrainer(trainer);
                      setProfileDialogOpen(true);
                    }}
                  >
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs dark:border-gray-600 dark:text-gray-300"
                    onClick={() => {
                      setSelectedTrainer(trainer);
                      setAssignDialogOpen(true);
                    }}
                  >
                    Assign Templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No trainers found' : 'No trainers yet'}
          description={
            searchQuery
              ? 'Try adjusting your search criteria'
              : 'Invite trainers to join your studio'
          }
          actionLabel={!searchQuery ? 'Invite Trainer' : undefined}
          onAction={!searchQuery ? () => setInviteDialogOpen(true) : undefined}
        />
      )}

      {/* Invite Trainer Dialog */}
      <InviteTrainerDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Trainer Profile Dialog */}
      <TrainerProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        trainer={selectedTrainer}
      />

      {/* Assign Templates Dialog */}
      {selectedTrainer && (
        <AssignTemplateDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          trainerId={selectedTrainer.id}
          trainerName={`${selectedTrainer.first_name} ${selectedTrainer.last_name}`}
        />
      )}
    </div>
  );
}
