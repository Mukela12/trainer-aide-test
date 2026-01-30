'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Users,
  Mail,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { InviteTrainerDialog } from '@/components/studio-owner/InviteTrainerDialog';
import ContentHeader from '@/components/shared/ContentHeader';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  staff_type: string;
  is_onboarded: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export default function TeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/trainers');
      if (!response.ok) throw new Error('Failed to fetch staff');
      const data = await response.json();
      setStaff(data.trainers || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      if (!response.ok) throw new Error('Failed to fetch invitations');
      const data = await response.json();
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchInvitations();
  }, []);

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to revoke invitation');
      // Refresh invitations list
      fetchInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
    }
  };

  const handleInviteSuccess = () => {
    fetchInvitations();
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const isLoading = loadingStaff || loadingInvitations;

  const getStatusBadge = (status: Invitation['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock size={12} className="mr-1" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 size={12} className="mr-1" />
            Accepted
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            Expired
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="secondary" className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <XCircle size={12} className="mr-1" />
            Revoked
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Manage your studio team and send invitations"
        stats={[
          { label: 'team members', value: loadingStaff ? '...' : staff.length, color: 'primary' },
          { label: 'pending invites', value: loadingInvitations ? '...' : pendingInvitations.length, color: 'warning' },
        ]}
        actions={
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
          >
            <UserPlus size={20} />
            <span className="hidden sm:inline">Invite Member</span>
          </Button>
        }
      />

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id} className="dark:bg-gray-800 dark:border-gray-700 border-yellow-200 dark:border-yellow-800/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg dark:text-gray-100">
                        {invitation.firstName && invitation.lastName
                          ? `${invitation.firstName} ${invitation.lastName}`
                          : invitation.email}
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {invitation.role}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Revoke invitation"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail size={14} className="flex-shrink-0" />
                      <span className="truncate">{invitation.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(invitation.status)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Current Team Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Current Team ({staff.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading team...</div>
        ) : staff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {staff.map((member) => (
              <Card key={member.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-wondrous-cyan flex items-center justify-center">
                        <span className="text-lg font-semibold text-wondrous-dark-blue">
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base lg:text-lg dark:text-gray-100">
                          {member.first_name} {member.last_name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {member.staff_type}
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
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={member.is_onboarded ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {member.is_onboarded ? 'Active' : 'Pending Setup'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite trainers and staff to join your studio"
            actionLabel="Invite Team Member"
            onAction={() => setInviteDialogOpen(true)}
          />
        )}
      </div>

      {/* Invite Dialog */}
      <InviteTrainerDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
