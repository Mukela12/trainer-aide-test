'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MoreVertical,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddClientDialog } from '@/components/studio-owner/AddClientDialog';
import { InviteClientDialog } from '@/components/studio-owner/InviteClientDialog';
import { EditClientDialog } from '@/components/studio-owner/EditClientDialog';
import { format } from 'date-fns';
import ContentHeader from '@/components/shared/ContentHeader';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  credits: number | null;
  is_onboarded: boolean;
  created_at: string;
}

export default function SoloClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clients?id=${clientId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete client');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  // Filter clients by search query
  const filteredClients = clients.filter((client) => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query))
    );
  });

  // Calculate stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.is_onboarded).length;
  const totalCredits = clients.reduce((sum, c) => sum + (c.credits || 0), 0);
  const newThisMonth = clients.filter(c => {
    const createdDate = new Date(c.created_at);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() &&
           createdDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Manage your client roster and track their progress"
        stats={[
          { label: 'total', value: isLoading ? '...' : totalClients, color: 'primary' },
          { label: 'active', value: isLoading ? '...' : activeClients, color: 'success' },
          { label: 'new this month', value: isLoading ? '...' : newThisMonth, color: 'magenta' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Invite</span>
            </Button>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Add Client</span>
            </Button>
          </div>
        }
      />

      <div className="mb-6 lg:mb-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <StatCard
            title="Total Clients"
            value={isLoading ? '...' : totalClients}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Active Clients"
            value={isLoading ? '...' : activeClients}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Total Credits"
            value={isLoading ? '...' : totalCredits}
            icon={CreditCard}
            color="magenta"
          />
          <StatCard
            title="New This Month"
            value={isLoading ? '...' : newThisMonth}
            icon={Calendar}
            color="orange"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-wondrous-dark-blue">
                        {client.first_name?.[0]}{client.last_name?.[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {client.first_name} {client.last_name}
                        </h3>
                        {client.is_onboarded ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          <span className="truncate max-w-[200px]">{client.email}</span>
                        </span>
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credits & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Credits</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {client.credits || 0}
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Joined</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(client.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditClient(client)}>
                          <Edit size={14} className="mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClient(client.id, `${client.first_name} ${client.last_name}`)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No clients found' : 'No clients yet'}
          description={
            searchQuery
              ? 'Try adjusting your search criteria'
              : 'Add your first client to get started'
          }
          actionLabel={!searchQuery ? 'Add Client' : undefined}
          onAction={!searchQuery ? () => setAddDialogOpen(true) : undefined}
        />
      )}

      {/* Dialogs */}
      <AddClientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchClients}
      />

      <InviteClientDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchClients}
      />

      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={(open) => !open && setEditClient(null)}
          onSuccess={fetchClients}
        />
      )}
    </div>
  );
}
