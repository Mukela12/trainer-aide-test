'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Archive,
  ArchiveRestore,
  Send,
  X,
  Filter,
  ArrowUpDown,
  MessageSquare,
  UserCheck,
  Gift,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AddClientDialog } from '@/components/studio-owner/AddClientDialog';
import { InviteClientDialog } from '@/components/studio-owner/InviteClientDialog';
import { EditClientDialog } from '@/components/studio-owner/EditClientDialog';
import { RewardCreditsDialog } from '@/components/studio-owner/RewardCreditsDialog';
import { SendEmailDialog } from '@/components/shared/SendEmailDialog';
import BookingHistory from '@/components/studio-owner/BookingHistory';
import { format } from 'date-fns';
import ContentHeader from '@/components/shared/ContentHeader';
import { useUserStore } from '@/lib/stores/user-store';
import { useClients, usePatchClient } from '@/lib/hooks/use-clients';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  credits: number | null;
  is_onboarded: boolean;
  is_archived: boolean;
  created_at: string;
  last_session_date?: string | null;
}

// Helper function to generate DiceBear avatar URL
const getAvatarUrl = (name: string) => {
  const hash = name.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const avatarId = Math.abs(hash) % 1000;
  const styles = ['avataaars', 'personas', 'micah'];
  const style = styles[Math.abs(hash) % styles.length];

  return `https://api.dicebear.com/7.x/${style}/svg?seed=${avatarId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=80`;
};

// Helper function to get initials
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

// Helper function to handle WhatsApp
const handleWhatsApp = (phone: string) => {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleanPhone}`, '_blank');
};

type SortField = 'name' | 'credits' | 'created_at' | 'last_session_date';
type CreditFilter = 'all' | 'with-credits' | 'low-credits' | 'no-credits';
type StatusFilter = 'all' | 'active' | 'pending' | 'archived';

export default function ClientsPage() {
  const { currentUser } = useUserStore();
  const { data: clients = [], isLoading } = useClients(currentUser?.id);
  const patchClient = usePatchClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [rewardCreditsClient, setRewardCreditsClient] = useState<Client | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailClient, setEmailClient] = useState<Client | null>(null);

  // Drawer state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);

  // Filter states
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter dropdown states
  const [showCreditFilterDropdown, setShowCreditFilterDropdown] = useState(false);
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const creditFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (creditFilterRef.current && !creditFilterRef.current.contains(event.target as Node)) {
        setShowCreditFilterDropdown(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openClientDrawer = (client: Client) => {
    setSelectedClient(client);
    setShowDrawer(true);
    setTimeout(() => setIsDrawerAnimating(true), 10);
  };

  const closeClientDrawer = () => {
    setIsDrawerAnimating(false);
    setTimeout(() => {
      setShowDrawer(false);
      setSelectedClient(null);
    }, 300);
  };

  const handleArchiveClient = async (clientId: string, archive: boolean) => {
    try {
      await patchClient.mutateAsync({ clientId, updates: { is_archived: archive } });
      if (selectedClient?.id === clientId) {
        closeClientDrawer();
      }
    } catch {
      // Error handled by React Query
    }
  };

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((client) => {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        return (
          fullName.includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query))
        );
      });
    }

    // Credit filter
    if (creditFilter !== 'all') {
      switch (creditFilter) {
        case 'with-credits':
          filtered = filtered.filter((c) => (c.credits || 0) > 0);
          break;
        case 'low-credits':
          filtered = filtered.filter((c) => (c.credits || 0) >= 1 && (c.credits || 0) <= 3);
          break;
        case 'no-credits':
          filtered = filtered.filter((c) => (c.credits || 0) === 0);
          break;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          filtered = filtered.filter((c) => c.is_onboarded && !c.is_archived);
          break;
        case 'pending':
          filtered = filtered.filter((c) => !c.is_onboarded && !c.is_archived);
          break;
        case 'archived':
          filtered = filtered.filter((c) => c.is_archived);
          break;
      }
    } else {
      // By default, hide archived clients unless explicitly filtering for them
      filtered = filtered.filter((c) => !c.is_archived);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      switch (sortField) {
        case 'name':
          valA = `${a.first_name} ${a.last_name}`.toLowerCase();
          valB = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'credits':
          valA = a.credits || 0;
          valB = b.credits || 0;
          break;
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        case 'last_session_date':
          valA = a.last_session_date ? new Date(a.last_session_date).getTime() : 0;
          valB = b.last_session_date ? new Date(b.last_session_date).getTime() : 0;
          break;
      }

      if (valA === null || valB === null) return 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchQuery, creditFilter, statusFilter, sortField, sortAsc]);

  // Calculate stats
  const totalClients = clients.filter(c => !c.is_archived).length;
  const activeClients = clients.filter((c) => c.is_onboarded && !c.is_archived).length;
  const clientsWithCredits = clients.filter((c) => (c.credits || 0) > 0 && !c.is_archived).length;
  const newThisMonth = clients.filter((c) => {
    if (c.is_archived) return false;
    const createdDate = new Date(c.created_at);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  }).length;

  const hasAnyFilters = creditFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Manage your client roster and track their progress"
        stats={totalClients > 0 ? [
          { label: 'total', value: isLoading ? '...' : totalClients, color: 'primary' },
          { label: 'active', value: isLoading ? '...' : activeClients, color: 'success' },
          { label: 'new this month', value: isLoading ? '...' : newThisMonth, color: 'magenta' },
        ] : []}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)} className="gap-2">
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
        {/* Stats Grid - Only show when there are clients */}
        {totalClients > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
            <StatCard title="Total Clients" value={isLoading ? '...' : totalClients} icon={Users} color="blue" />
            <StatCard title="Active Clients" value={isLoading ? '...' : activeClients} icon={UserCheck} color="green" />
            <StatCard title="With Credits" value={isLoading ? '...' : clientsWithCredits} icon={CreditCard} color="magenta" />
            <StatCard title="New This Month" value={isLoading ? '...' : newThisMonth} icon={Calendar} color="orange" />
          </div>
        )}

        {/* Search and Filters - Only show when there are enough clients */}
        {totalClients >= 3 && (
          <div className="space-y-3">
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

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
            {/* Credit Filter */}
            <div className="relative" ref={creditFilterRef}>
              <Button
                variant={creditFilter !== 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCreditFilterDropdown(!showCreditFilterDropdown)}
                className="gap-1"
              >
                <CreditCard size={14} />
                Credits
                {creditFilter !== 'all' && <span className="w-2 h-2 bg-white rounded-full" />}
              </Button>
              {showCreditFilterDropdown && (
                <div className="absolute left-0 z-50 w-40 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'with-credits', label: 'With Credits' },
                    { value: 'low-credits', label: 'Low (1-3)' },
                    { value: 'no-credits', label: 'No Credits' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        setCreditFilter(option.value as CreditFilter);
                        setShowCreditFilterDropdown(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusFilterRef}>
              <Button
                variant={statusFilter !== 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
                className="gap-1"
              >
                <Filter size={14} />
                Status
                {statusFilter !== 'all' && <span className="w-2 h-2 bg-white rounded-full" />}
              </Button>
              {showStatusFilterDropdown && (
                <div className="absolute left-0 z-50 w-40 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
                  {[
                    { value: 'all', label: 'All Active' },
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'archived', label: 'Archived' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        setStatusFilter(option.value as StatusFilter);
                        setShowStatusFilterDropdown(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="gap-1"
              >
                <ArrowUpDown size={14} />
                Sort
              </Button>
              {showSortDropdown && (
                <div className="absolute left-0 z-50 w-48 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
                  {[
                    { field: 'name', label: 'Name' },
                    { field: 'credits', label: 'Credits' },
                    { field: 'created_at', label: 'Join Date' },
                    { field: 'last_session_date', label: 'Last Session' },
                  ].map((option) => (
                    <button
                      key={option.field}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex justify-between items-center"
                      onClick={() => {
                        if (sortField === option.field) {
                          setSortAsc(!sortAsc);
                        } else {
                          setSortField(option.field as SortField);
                          setSortAsc(true);
                        }
                        setShowSortDropdown(false);
                      }}
                    >
                      {option.label}
                      {sortField === option.field && (
                        <span className="text-xs text-gray-500">{sortAsc ? 'A-Z' : 'Z-A'}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasAnyFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreditFilter('all');
                  setStatusFilter('all');
                }}
                className="text-gray-500"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalClients === 0 ? (
        // First-run empty state with instructional copy
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Users className="text-slate-400 dark:text-slate-500" size={40} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Add your first client
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            Clients are the foundation of your studio. Add one manually or invite them to join.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <UserPlus size={18} />
              Add client manually
            </Button>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              <Send size={18} />
              Invite client by link
            </Button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-8">Step 1 of 3 — Add your first client</p>
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${client.is_archived ? 'opacity-60' : ''}`}
              onClick={() => openClientDrawer(client)}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img
                        src={getAvatarUrl(`${client.first_name} ${client.last_name}`)}
                        alt={`${client.first_name} ${client.last_name}`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div
                        className="w-12 h-12 rounded-full bg-wondrous-blue-light items-center justify-center hidden"
                      >
                        <span className="text-lg font-semibold text-wondrous-dark-blue">
                          {getInitials(client.first_name, client.last_name)}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {client.first_name} {client.last_name}
                        </h3>
                        {client.is_archived ? (
                          <Badge variant="secondary" className="text-xs">Archived</Badge>
                        ) : client.is_onboarded ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
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
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{client.credits || 0}</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Joined</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(client.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRewardCreditsClient(client); }}>
                          <Gift size={14} className="mr-2 text-purple-600" />
                          Reward Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
                          <Edit size={14} className="mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {client.is_archived ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveClient(client.id, false); }}>
                            <ArchiveRestore size={14} className="mr-2" />
                            Restore Client
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleArchiveClient(client.id, true); }}
                            className="text-orange-600 focus:text-orange-600"
                          >
                            <Archive size={14} className="mr-2" />
                            Archive Client
                          </DropdownMenuItem>
                        )}
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
          title={searchQuery || hasAnyFilters ? 'No clients found' : 'No clients yet'}
          description={
            searchQuery || hasAnyFilters
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first client to get started'
          }
          actionLabel={!searchQuery && !hasAnyFilters ? 'Add Client' : undefined}
          onAction={!searchQuery && !hasAnyFilters ? () => setAddDialogOpen(true) : undefined}
        />
      )}

      {/* Client Detail Drawer */}
      {(showDrawer || isDrawerAnimating) && selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${isDrawerAnimating ? 'opacity-50' : 'opacity-0'}`}
            onClick={closeClientDrawer}
          />

          {/* Drawer */}
          <div
            className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Client Profile</h2>
                <button onClick={closeClientDrawer} className="p-2 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto sm:p-6">
                  {/* Profile Image and Basic Info */}
                  <div className="mb-6 text-center">
                    <div className="relative inline-block mb-3">
                      <img
                        src={getAvatarUrl(`${selectedClient.first_name} ${selectedClient.last_name}`)}
                        alt={`${selectedClient.first_name} ${selectedClient.last_name}`}
                        className="w-20 h-20 border-4 border-white rounded-full shadow-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-wondrous-magenta to-wondrous-blue items-center justify-center text-xl font-bold text-white border-4 border-white shadow-lg hidden"
                      >
                        {getInitials(selectedClient.first_name, selectedClient.last_name)}
                      </div>
                    </div>

                    <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </h3>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{selectedClient.email}</p>

                    {/* Member Since */}
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Member since {format(new Date(selectedClient.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="mb-6 space-y-3">
                    <div className="p-3 rounded-lg bg-wondrous-blue/10 dark:bg-wondrous-blue/20">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-wondrous-blue" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Credits</p>
                          <p className="text-lg font-bold text-wondrous-blue">{selectedClient.credits || 0}</p>
                        </div>
                      </div>
                    </div>

                    {selectedClient.phone && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClient.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Status</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedClient.is_archived ? 'Archived' : selectedClient.is_onboarded ? 'Active' : 'Pending Onboarding'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="mb-6 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact</h4>

                    <button
                      onClick={() => {
                        setEmailClient(selectedClient);
                        setEmailDialogOpen(true);
                      }}
                      className="flex items-center w-full gap-3 p-3 transition-colors rounded-lg bg-wondrous-magenta/10 hover:bg-wondrous-magenta/20"
                    >
                      <Mail className="w-4 h-4 text-wondrous-magenta" />
                      <span className="text-sm font-medium text-wondrous-magenta">Send Email</span>
                    </button>

                    {selectedClient.phone && (
                      <button
                        onClick={() => handleWhatsApp(selectedClient.phone || '')}
                        className="flex items-center w-full gap-3 p-3 transition-colors rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                      >
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">WhatsApp</span>
                      </button>
                    )}
                  </div>

                  {/* Booking History */}
                  <div className="mb-6">
                    <BookingHistory
                      clientId={selectedClient.id}
                      clientName={`${selectedClient.first_name} ${selectedClient.last_name}`}
                    />
                  </div>
                </div>

                {/* Fixed Bottom Actions */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={() => {
                      setRewardCreditsClient(selectedClient);
                      closeClientDrawer();
                    }}
                    className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-white transition-colors bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
                  >
                    <Gift className="w-5 h-5" />
                    Reward Credits
                  </button>
                  {selectedClient.is_archived ? (
                    <button
                      onClick={() => handleArchiveClient(selectedClient.id, false)}
                      className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <ArchiveRestore className="w-5 h-5" />
                      Restore Client
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchiveClient(selectedClient.id, true)}
                      className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-orange-600 transition-colors bg-orange-50 rounded-lg hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
                    >
                      <Archive className="w-5 h-5" />
                      Archive Client
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <InviteClientDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={(open) => !open && setEditClient(null)}
        />
      )}
      {emailClient && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) setEmailClient(null);
          }}
          recipient={{
            id: emailClient.id,
            email: emailClient.email,
            name: `${emailClient.first_name} ${emailClient.last_name}`,
          }}
        />
      )}

      {rewardCreditsClient && (
        <RewardCreditsDialog
          client={rewardCreditsClient}
          open={!!rewardCreditsClient}
          onOpenChange={(open) => !open && setRewardCreditsClient(null)}
        />
      )}
    </div>
  );
}
