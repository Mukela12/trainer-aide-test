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
  Trash2,
  Send,
  Link as LinkIcon,
  X,
  ChevronDown,
  ArrowUpDown,
  Clock,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Archive,
  ArchiveRestore,
  Gift,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { useClients, usePatchClient, useDeleteClient } from '@/lib/hooks/use-clients';
import { useBookingHistory } from '@/lib/hooks/use-booking-history';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddClientDialog } from '@/components/studio-owner/AddClientDialog';
import { InviteClientDialog } from '@/components/studio-owner/InviteClientDialog';
import { EditClientDialog } from '@/components/studio-owner/EditClientDialog';
import { RewardCreditsDialog } from '@/components/studio-owner/RewardCreditsDialog';
import { SendEmailDialog } from '@/components/shared/SendEmailDialog';
import { format, formatDistanceToNow } from 'date-fns';
import ContentHeader from '@/components/shared/ContentHeader';
import { cn } from '@/lib/utils/cn';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  credits: number | null;
  is_onboarded: boolean;
  is_archived?: boolean;
  created_at: string;
  last_session_date?: string | null;
}

type SortField = 'name' | 'credits' | 'created_at' | 'last_session';
type CreditFilter = 'all' | 'with-credits' | 'low-credits' | 'no-credits';
type StatusFilter = 'all' | 'active' | 'pending';

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
};

export default function SoloClientsPage() {
  const { currentUser } = useUserStore();
  const { data: clients = [], isLoading } = useClients(currentUser?.id);
  const patchClient = usePatchClient();
  const deleteClientMutation = useDeleteClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [rewardCreditsClient, setRewardCreditsClient] = useState<Client | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailClient, setEmailClient] = useState<Client | null>(null);

  // Enhanced features state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreditFilter, setShowCreditFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Refs for click-outside detection
  const creditFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (creditFilterRef.current && !creditFilterRef.current.contains(event.target as Node)) {
        setShowCreditFilter(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Booking history via React Query (auto-fetches when selectedClient is set)
  const { data: bookingHistory = [], isLoading: loadingHistory } = useBookingHistory(selectedClient?.id);

  // Open client drawer with animation
  const openClientDrawer = (client: Client) => {
    setSelectedClient(client);
    setShowDrawer(true);
    setShowAllHistory(false);
    setTimeout(() => setIsDrawerAnimating(true), 10);
  };

  // Close client drawer with animation
  const closeClientDrawer = () => {
    setIsDrawerAnimating(false);
    setTimeout(() => {
      setShowDrawer(false);
      setSelectedClient(null);
    }, 300);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteClientMutation.mutateAsync(clientId);
      if (selectedClient?.id === clientId) {
        closeClientDrawer();
      }
    } catch {
      // Error handled by React Query
    }
  };

  const handleArchiveClient = async (client: Client) => {
    const isCurrentlyArchived = client.is_archived;
    const action = isCurrentlyArchived ? 'restore' : 'archive';
    const clientName = `${client.first_name} ${client.last_name}`;

    if (!confirm(`Are you sure you want to ${action} "${clientName}"?`)) {
      return;
    }

    try {
      await patchClient.mutateAsync({ clientId: client.id, updates: { is_archived: !isCurrentlyArchived } });
      // Update selected client if in drawer
      if (selectedClient?.id === client.id) {
        setSelectedClient({ ...selectedClient, is_archived: !isCurrentlyArchived });
      }
    } catch {
      alert(`Failed to ${action} client`);
    }
  };

  // Contact action handlers
  const openEmailDialog = (client: Client) => {
    setEmailClient(client);
    setEmailDialogOpen(true);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((client) => {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        return (
          fullName.includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query))
        );
      });
    }

    // Apply credit filter
    if (creditFilter !== 'all') {
      switch (creditFilter) {
        case 'with-credits':
          result = result.filter((c) => (c.credits || 0) > 0);
          break;
        case 'low-credits':
          result = result.filter((c) => (c.credits || 0) >= 1 && (c.credits || 0) <= 3);
          break;
        case 'no-credits':
          result = result.filter((c) => (c.credits || 0) === 0);
          break;
      }
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) =>
        statusFilter === 'active' ? c.is_onboarded : !c.is_onboarded
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'credits':
          aVal = a.credits || 0;
          bVal = b.credits || 0;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'last_session':
          aVal = a.last_session_date ? new Date(a.last_session_date).getTime() : 0;
          bVal = b.last_session_date ? new Date(b.last_session_date).getTime() : 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchQuery, creditFilter, statusFilter, sortField, sortAsc]);

  // Calculate stats
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.is_onboarded).length;
  const totalCredits = clients.reduce((sum, c) => sum + (c.credits || 0), 0);
  const newThisMonth = clients.filter((c) => {
    const createdDate = new Date(c.created_at);
    const now = new Date();
    return (
      createdDate.getMonth() === now.getMonth() &&
      createdDate.getFullYear() === now.getFullYear()
    );
  }).length;
  const lowCreditClients = clients.filter((c) => (c.credits || 0) >= 1 && (c.credits || 0) <= 3).length;

  // Generate avatar URL using DiceBear
  const getAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const avatarId = Math.abs(hash) % 1000;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarId}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=80`;
  };

  // Display history items
  const displayedHistory = showAllHistory ? bookingHistory : bookingHistory.slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header - Only show full header when we have clients */}
      {totalClients > 0 && (
        <ContentHeader
          context="Manage your client roster and track their progress"
          stats={[
            { label: 'total', value: isLoading ? '...' : totalClients, color: 'primary' },
            { label: 'active', value: isLoading ? '...' : activeClients, color: 'success' },
            { label: 'new this month', value: isLoading ? '...' : newThisMonth, color: 'magenta' },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <Send size={18} />
                <span className="hidden sm:inline">Invite</span>
              </Button>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-wondrous-blue to-wondrous-magenta hover:from-wondrous-blue/90 hover:to-wondrous-magenta/90"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </div>
          }
        />
      )}

      {/* Stats and Search - Only show when we have clients */}
      {totalClients > 0 && (
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
              color="slate"
            />
            <StatCard
              title="Low Credits"
              value={isLoading ? '...' : lowCreditClients}
              icon={AlertCircle}
              color="slate"
            />
          </div>

          {/* Search and Filters */}
          {totalClients >= 3 && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  type="text"
                  placeholder="Search clients by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowUpDown size={14} />
                      Sort: {sortField === 'name' ? 'Name' : sortField === 'credits' ? 'Credits' : sortField === 'created_at' ? 'Joined' : 'Last Session'}
                      {!sortAsc && ' (desc)'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleSort('name')}>
                      Name {sortField === 'name' && (sortAsc ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('credits')}>
                      Credits {sortField === 'credits' && (sortAsc ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('created_at')}>
                      Date Joined {sortField === 'created_at' && (sortAsc ? '↑' : '↓')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('last_session')}>
                      Last Session {sortField === 'last_session' && (sortAsc ? '↑' : '↓')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Credit Filter */}
                <div className="relative" ref={creditFilterRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreditFilter(!showCreditFilter)}
                    className={cn('gap-2', creditFilter !== 'all' && 'border-wondrous-blue bg-wondrous-blue-light dark:bg-wondrous-blue/10')}
                  >
                    <CreditCard size={14} />
                    Credits: {creditFilter === 'all' ? 'All' : creditFilter === 'with-credits' ? 'Has' : creditFilter === 'low-credits' ? 'Low' : 'None'}
                    <ChevronDown size={14} />
                  </Button>
                  {showCreditFilter && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {(['all', 'with-credits', 'low-credits', 'no-credits'] as CreditFilter[]).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setCreditFilter(filter);
                            setShowCreditFilter(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                            creditFilter === filter && 'bg-wondrous-blue-light dark:bg-wondrous-blue/10 text-wondrous-dark-blue dark:text-wondrous-blue'
                          )}
                        >
                          {filter === 'all' ? 'All' : filter === 'with-credits' ? 'Has Credits' : filter === 'low-credits' ? 'Low (1-3)' : 'No Credits'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div className="relative" ref={statusFilterRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusFilter(!showStatusFilter)}
                    className={cn('gap-2', statusFilter !== 'all' && 'border-wondrous-blue bg-wondrous-blue-light dark:bg-wondrous-blue/10')}
                  >
                    <Users size={14} />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Pending'}
                    <ChevronDown size={14} />
                  </Button>
                  {showStatusFilter && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {(['all', 'active', 'pending'] as StatusFilter[]).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setStatusFilter(filter);
                            setShowStatusFilter(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                            statusFilter === filter && 'bg-wondrous-blue-light dark:bg-wondrous-blue/10 text-wondrous-dark-blue dark:text-wondrous-blue'
                          )}
                        >
                          {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(creditFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreditFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={14} className="mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openClientDrawer(client)}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={getAvatarUrl(`${client.first_name} ${client.last_name}`)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-semibold text-wondrous-dark-blue">${client.first_name?.[0]}${client.last_name?.[0]}</span>`;
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {client.first_name} {client.last_name}
                        </h3>
                        {client.is_onboarded ? (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
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
                      <div
                        className={cn(
                          'font-semibold',
                          (client.credits || 0) === 0
                            ? 'text-red-600 dark:text-red-400'
                            : (client.credits || 0) <= 3
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
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
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRewardCreditsClient(client);
                          }}
                        >
                          <Gift size={14} className="mr-2 text-purple-600" />
                          Reward Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditClient(client);
                          }}
                        >
                          <Edit size={14} className="mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClient(client);
                          }}
                          className={client.is_archived ? "text-green-600 focus:text-green-600" : "text-orange-600 focus:text-orange-600"}
                        >
                          {client.is_archived ? (
                            <>
                              <ArchiveRestore size={14} className="mr-2" />
                              Restore Client
                            </>
                          ) : (
                            <>
                              <Archive size={14} className="mr-2" />
                              Archive Client
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery || creditFilter !== 'all' || statusFilter !== 'all' ? (
        <EmptyState icon={Users} title="No clients found" description="Try adjusting your search or filter criteria" />
      ) : (
        /* First-run empty state with instructional copy */
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Users className="text-slate-400 dark:text-slate-500" size={40} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Add your first client
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            Start building the foundations of your business — let&apos;s invite your first client. You can also import clients in bulk via CSV.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-wondrous-blue to-wondrous-magenta hover:from-wondrous-blue/90 hover:to-wondrous-magenta/90"
            >
              <UserPlus size={18} />
              Add client manually
            </Button>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              <LinkIcon size={18} />
              Invite client by link
            </Button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-8">Step 1 of 3 — Add your first client</p>
        </div>
      )}

      {/* Client Drawer */}
      {showDrawer && selectedClient && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={cn(
              'absolute inset-0 bg-black/50 transition-opacity duration-300',
              isDrawerAnimating ? 'opacity-100' : 'opacity-0'
            )}
            onClick={closeClientDrawer}
          />

          {/* Drawer */}
          <div
            className={cn(
              'absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto',
              isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Client Details</h2>
                <Button variant="ghost" size="sm" onClick={closeClientDrawer} className="h-8 w-8 p-0">
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Profile Section */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-wondrous-blue-light flex items-center justify-center mx-auto mb-3 overflow-hidden">
                  <img
                    src={getAvatarUrl(`${selectedClient.first_name} ${selectedClient.last_name}`)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-semibold text-wondrous-dark-blue">${selectedClient.first_name?.[0]}${selectedClient.last_name?.[0]}</span>`;
                    }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedClient.first_name} {selectedClient.last_name}
                </h3>
                <div className="mt-2">
                  {selectedClient.is_onboarded ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => openEmailDialog(selectedClient)}>
                  <Mail size={16} />
                  Email
                </Button>
                {selectedClient.phone && (
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => handleWhatsApp(selectedClient.phone!)}>
                    <MessageCircle size={16} />
                    WhatsApp
                  </Button>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credits</div>
                  <div
                    className={cn(
                      'text-xl font-semibold',
                      (selectedClient.credits || 0) === 0
                        ? 'text-red-600 dark:text-red-400'
                        : (selectedClient.credits || 0) <= 3
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {selectedClient.credits || 0}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Member Since</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format(new Date(selectedClient.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{selectedClient.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => openEmailDialog(selectedClient)}
                    >
                      <ExternalLink size={14} />
                    </Button>
                  </div>
                  {selectedClient.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{selectedClient.phone}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={() => handleWhatsApp(selectedClient.phone!)}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking History */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Session History</h4>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : bookingHistory.length > 0 ? (
                  <div className="space-y-2">
                    {displayedHistory.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {booking.session_name || 'Session'}
                          </span>
                          <span className={cn('px-2 py-0.5 text-xs rounded-full', STATUS_COLORS[booking.status] || STATUS_COLORS.pending)}>
                            {booking.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(booking.scheduled_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {format(new Date(booking.scheduled_at), 'h:mm a')}
                          </span>
                          {booking.credits_used > 0 && (
                            <span className="flex items-center gap-1">
                              <CreditCard size={12} />
                              {booking.credits_used} credits
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {bookingHistory.length > 3 && !showAllHistory && (
                      <Button variant="ghost" size="sm" onClick={() => setShowAllHistory(true)} className="w-full text-purple-600 dark:text-purple-400">
                        View all {bookingHistory.length} sessions
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    No session history yet
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-wondrous-blue to-wondrous-magenta hover:from-wondrous-blue/90 hover:to-wondrous-magenta/90"
                  onClick={() => {
                    setRewardCreditsClient(selectedClient);
                    closeClientDrawer();
                  }}
                >
                  <Gift size={16} />
                  Reward Credits
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setEditClient(selectedClient);
                    closeClientDrawer();
                  }}
                >
                  <Edit size={16} />
                  Edit Client
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full gap-2",
                    selectedClient.is_archived
                      ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      : "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  )}
                  onClick={() => handleArchiveClient(selectedClient)}
                >
                  {selectedClient.is_archived ? (
                    <>
                      <ArchiveRestore size={16} />
                      Restore Client
                    </>
                  ) : (
                    <>
                      <Archive size={16} />
                      Archive Client
                    </>
                  )}
                </Button>
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
