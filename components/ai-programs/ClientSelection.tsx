'use client';

import { useState } from 'react';
import { Search, User, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/hooks/use-clients';
import { useUserStore } from '@/lib/stores/user-store';
import type { ClientProfile } from '@/lib/types/client-profile';

interface ClientSelectionProps {
  selectedClient: ClientProfile | null;
  onSelect: (client: ClientProfile | null) => void;
  onBack: () => void;
}

export function ClientSelection({ selectedClient, onSelect, onBack }: ClientSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [useCustomParams, setUseCustomParams] = useState(false);

  const { currentUser } = useUserStore();
  const { data: rawClients = [], isLoading: loading } = useClients(currentUser?.id);
  const clients = rawClients as unknown as ClientProfile[];

  const filteredClients = clients.filter((client) => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleClientClick = (client: ClientProfile) => {
    setUseCustomParams(false);
    onSelect(client);
  };

  const handleCustomParams = () => {
    setUseCustomParams(true);
    onSelect(null);
  };

  const handleContinue = () => {
    if (selectedClient || useCustomParams) {
      onSelect(selectedClient);
    }
  };

  const getGoalLabel = (goal?: string) => {
    const labels: Record<string, string> = {
      strength: 'Strength',
      hypertrophy: 'Muscle Gain',
      endurance: 'Endurance',
      fat_loss: 'Fat Loss',
      general_fitness: 'General Fitness',
    };
    return goal ? labels[goal] || goal : 'Not set';
  };

  const getExperienceLabel = (level?: string) => {
    const labels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return level ? labels[level] || level : 'Not set';
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No clients found matching your search' : 'No clients yet'}
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all ${
                selectedClient?.id === client.id && !useCustomParams
                  ? 'border-2 border-wondrous-magenta bg-purple-50/50 dark:bg-purple-900/20'
                  : 'hover:border-wondrous-magenta dark:hover:border-purple-400'
              }`}
              onClick={() => handleClientClick(client)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedClient?.id === client.id && !useCustomParams
                        ? 'border-wondrous-magenta bg-wondrous-magenta'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedClient?.id === client.id && !useCustomParams && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-gray-400 flex-shrink-0" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {client.first_name} {client.last_name}
                      </h4>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                      <p>
                        {getExperienceLabel(client.experience_level)} •{' '}
                        {getGoalLabel(client.primary_goal)}
                      </p>
                      {client.available_equipment && client.available_equipment.length > 0 && (
                        <p className="truncate">
                          Equipment: {client.available_equipment.slice(0, 3).join(', ')}
                          {client.available_equipment.length > 3 && ` +${client.available_equipment.length - 3} more`}
                        </p>
                      )}
                      {client.injuries && client.injuries.length > 0 && (
                        <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {client.injuries.length} injury/injuries noted
                        </p>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Custom Parameters Option */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">OR</p>
        <Card
          className={`cursor-pointer transition-all ${
            useCustomParams
              ? 'border-2 border-wondrous-magenta bg-purple-50/50 dark:bg-purple-900/20'
              : 'hover:border-wondrous-magenta dark:hover:border-purple-400'
          }`}
          onClick={handleCustomParams}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  useCustomParams
                    ? 'border-wondrous-magenta bg-wondrous-magenta'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {useCustomParams && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Use custom parameters
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a program without selecting a client
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedClient && !useCustomParams}
          className="bg-wondrous-primary hover:bg-purple-700 text-white"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
