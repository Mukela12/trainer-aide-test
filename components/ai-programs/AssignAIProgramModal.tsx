'use client';

import { useState, useEffect } from 'react';
import { X, User, Search, CheckCircle2, Users, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/hooks/use-clients';
import { useAssignAIProgram } from '@/lib/hooks/use-ai-programs';
import { useTrainers } from '@/lib/hooks/use-trainers';
import { useUserStore } from '@/lib/stores/user-store';

interface AssignAIProgramModalProps {
  programId: string;
  programName: string;
  onClose: () => void;
  onAssigned?: () => void;
  initialMode?: 'client' | 'trainer';
}

export function AssignAIProgramModal({
  programId,
  programName,
  onClose,
  onAssigned,
  initialMode = 'client'
}: AssignAIProgramModalProps) {
  const [assignmentType, setAssignmentType] = useState<'client' | 'trainer'>(initialMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // React Query: fetch clients
  const { currentUser } = useUserStore();
  const { data: clients = [], isLoading: clientsLoading } = useClients(currentUser?.id);

  // React Query: fetch trainers
  const { data: trainers = [], isLoading: trainersLoading } = useTrainers();

  // React Query: assign mutation
  const assignMutation = useAssignAIProgram();

  // Determine loading state based on assignment type
  const loading = assignmentType === 'client' ? clientsLoading : trainersLoading;

  // Reset selection and search when switching assignment type
  useEffect(() => {
    setSelectedId(null);
    setSearchTerm('');
    setError(null);
  }, [assignmentType]);

  const filteredClients = clients.filter((client: { first_name: string; last_name: string; email: string }) =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTrainers = trainers.filter(trainer =>
    `${trainer.first_name} ${trainer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedId) return;

    try {
      setError(null);

      if (assignmentType === 'client') {
        await assignMutation.mutateAsync({ programId, clientId: selectedId });
      } else {
        await assignMutation.mutateAsync({ programId, trainerId: selectedId });
      }

      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign program');
    }
  };

  const assigning = assignMutation.isPending;

  const renderList = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            Loading {assignmentType === 'client' ? 'clients' : 'trainers'}...
          </p>
        </div>
      );
    }

    if (assignmentType === 'client') {
      if (filteredClients.length === 0) {
        return (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No clients found matching your search.' : 'No clients available.'}
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {filteredClients.map((client: { id: string; first_name: string; last_name: string; email: string }) => (
            <button
              key={client.id}
              onClick={() => setSelectedId(client.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedId === client.id
                  ? 'border-wondrous-magenta bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wondrous-magenta/20 to-wondrous-blue/20 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-wondrous-magenta" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {client.first_name} {client.last_name}
                    </h3>
                    {selectedId === client.id && (
                      <CheckCircle2 size={16} className="text-wondrous-magenta" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      );
    }

    // Trainer list
    if (filteredTrainers.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No trainers found matching your search.' : 'No trainers available.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredTrainers.map((trainer) => (
          <button
            key={trainer.id}
            onClick={() => setSelectedId(trainer.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedId === trainer.id
                ? 'border-wondrous-magenta bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {trainer.first_name} {trainer.last_name}
                  </h3>
                  {selectedId === trainer.id && (
                    <CheckCircle2 size={16} className="text-wondrous-magenta" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{trainer.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">{trainer.staff_type}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
              Assign Program
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {programName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </Button>
        </div>

        <CardContent className="p-6 flex-1 overflow-auto">
          {/* Assignment Type Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={assignmentType === 'client' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssignmentType('client')}
              className={assignmentType === 'client' ? 'bg-wondrous-primary hover:bg-purple-700' : ''}
            >
              <Users size={16} className="mr-2" />
              Assign to Client
            </Button>
            <Button
              variant={assignmentType === 'trainer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssignmentType('trainer')}
              className={assignmentType === 'trainer' ? 'bg-wondrous-primary hover:bg-purple-700' : ''}
            >
              <Dumbbell size={16} className="mr-2" />
              Assign to Trainer
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {assignmentType === 'client'
              ? 'Select a client to assign this AI program to. The client will have access to this program.'
              : 'Select a trainer to add this AI program to their toolkit. They can use it with any of their clients.'}
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${assignmentType === 'client' ? 'clients' : 'trainers'}...`}
                className="pl-10"
              />
            </div>
          </div>

          {/* List */}
          {renderList()}
        </CardContent>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId || assigning}
            className="flex-1 bg-wondrous-primary hover:bg-purple-700 text-white"
          >
            {assigning ? 'Assigning...' : `Assign to ${assignmentType === 'client' ? 'Client' : 'Trainer'}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Export with old name for backward compatibility
export { AssignAIProgramModal as AssignClientModal };
