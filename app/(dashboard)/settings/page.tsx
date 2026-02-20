"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  User, Bell, Shield, Palette, LogOut, Building2, Heart, CheckCircle2,
  AlertCircle, CalendarClock, Users, Lock, Loader2, Save,
  ListCheck, Plug, MessageSquare, Trash2, ChevronRight, AlertTriangle,
  Scale,
} from 'lucide-react';
import ContentHeader from '@/components/shared/ContentHeader';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  bio: string;
  brand_color: string;
  business_name: string;
  business_slug: string;
  role: string;
  business_logo_url: string | null;
}

interface CancellationPolicyData {
  booking_cutoff_hours?: number;
  buffer_minutes?: number;
  no_show_policy?: string;
  late_cancel_fee_percent?: number;
  grace_period_minutes?: number;
}

interface StudioData {
  booking_model: string | null;
  soft_hold_length: number | null;
  cancellation_window_hours: number | null;
  cancellation_policy: CancellationPolicyData | null;
  waitlist_config: { enabled?: boolean; max_capacity?: number } | null;
  opening_hours: Record<string, { enabled: boolean; slots: { start: string; end: string }[] }>;
  session_types: string[] | null;
}

// ---------------------------------------------------------------------------
// API fetch helpers
// ---------------------------------------------------------------------------

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch('/api/settings/profile');
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

async function patchProfile(data: Partial<ProfileData>): Promise<ProfileData> {
  const res = await fetch('/api/settings/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

async function fetchStudio(): Promise<StudioData> {
  const res = await fetch('/api/settings/studio');
  if (!res.ok) throw new Error('Failed to load studio settings');
  return res.json();
}

async function patchStudio(data: Partial<StudioData>): Promise<StudioData> {
  const res = await fetch('/api/settings/studio', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save studio settings');
  return res.json();
}

// ---------------------------------------------------------------------------
// Tab definitions (role-gated)
// ---------------------------------------------------------------------------

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[]; // empty = all roles
}

const TABS: SettingsTab[] = [
  { id: 'booking', label: 'Booking', icon: <CalendarClock size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
  { id: 'profile', label: 'Profile', icon: <User size={18} />, roles: [] },
  { id: 'business', label: 'Business Details', icon: <Building2 size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
  { id: 'waitlist', label: 'Waitlist', icon: <ListCheck size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
  { id: 'legal', label: 'Legal & Compliance', icon: <Scale size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
  { id: 'staff', label: 'Staff Management', icon: <Users size={18} />, roles: ['studio_owner'] },
  { id: 'health', label: 'Health & Safety', icon: <Heart size={18} />, roles: ['client'] },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, roles: [] },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={18} />, roles: [] },
  { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={18} />, roles: [] },
  { id: 'danger', label: 'Danger Zone', icon: <Trash2 size={18} />, roles: [] },
];

const COMING_SOON_TABS: SettingsTab[] = [
  { id: 'integrations', label: 'Integrations', icon: <Plug size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
  { id: 'sms', label: 'SMS Reminders', icon: <MessageSquare size={18} />, roles: ['solo_practitioner', 'studio_owner'] },
];

// ---------------------------------------------------------------------------
// Day names for opening hours
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<string, string> = {
  '0': 'Sunday',
  '1': 'Monday',
  '2': 'Tuesday',
  '3': 'Wednesday',
  '4': 'Thursday',
  '5': 'Friday',
  '6': 'Saturday',
};

const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0'];

// ---------------------------------------------------------------------------
// Brand colour presets
// ---------------------------------------------------------------------------

const BRAND_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#06B6D4', '#6366F1', '#14B8A6',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser, currentRole } = useUserStore();
  const { signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  // Role booleans
  const isClient = currentRole === 'client';
  const isOperator = currentRole === 'solo_practitioner' || currentRole === 'studio_owner';

  // Default tab: operators see Booking first, everyone else sees Profile
  const [activeTab, setActiveTab] = useState('profile');
  const initialTabSet = useRef(false);
  useEffect(() => {
    if (!initialTabSet.current && isOperator) {
      setActiveTab('booking');
      initialTabSet.current = true;
    }
  }, [isOperator]);

  // Health check state (client only)
  const [healthCheckStatus, setHealthCheckStatus] = useState<{
    completed: boolean;
    valid: boolean;
    completedAt: string | null;
  } | null>(null);

  // ---------- Data fetching ----------

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: fetchProfile,
    staleTime: 60 * 1000,
  });

  const { data: studio, isLoading: studioLoading } = useQuery({
    queryKey: ['settings', 'studio'],
    queryFn: fetchStudio,
    enabled: isOperator,
    staleTime: 60 * 1000,
  });

  // ---------- Form state ----------

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
  });

  const [businessForm, setBusinessForm] = useState({
    business_name: '',
  });

  const [openingHours, setOpeningHours] = useState<StudioData['opening_hours']>({});

  const [bookingForm, setBookingForm] = useState({
    self_booking_enabled: true,
    booking_model: 'instant',
    soft_hold_length: 30,
    cancellation_window_hours: 24,
  });

  const [policyForm, setPolicyForm] = useState<CancellationPolicyData>({
    booking_cutoff_hours: 2,
    buffer_minutes: 15,
    no_show_policy: '',
    late_cancel_fee_percent: 0,
    grace_period_minutes: 10,
  });

  const [waitlistForm, setWaitlistForm] = useState({
    enabled: false,
    max_capacity: 10,
  });

  const [brandColor, setBrandColor] = useState('#3B82F6');

  // Notification preferences (localStorage until server-side is ready)
  const [notifPrefs, setNotifPrefs] = useState({
    email_notifications: true,
    session_reminders: true,
    booking_confirmations: true,
    marketing_updates: false,
  });

  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  // ---------- Sync fetched data → form state ----------

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
      setBusinessForm({
        business_name: profile.business_name || '',
      });
      setBusinessLogo(profile.business_logo_url || null);
      setIsLoadingLogo(false);
      if (profile.brand_color) setBrandColor(profile.brand_color);
    }
  }, [profile]);

  useEffect(() => {
    if (studio) {
      setOpeningHours(studio.opening_hours || {});
      const model = studio.booking_model || 'instant';
      const isSelfBooking = model !== 'request';
      setBookingForm({
        self_booking_enabled: isSelfBooking,
        booking_model: isSelfBooking ? (model === 'soft-hold' ? 'soft-hold' : 'instant') : 'instant',
        soft_hold_length: studio.soft_hold_length ?? 30,
        cancellation_window_hours: studio.cancellation_window_hours ?? 24,
      });
      const cp = studio.cancellation_policy;
      if (cp) {
        setPolicyForm({
          booking_cutoff_hours: cp.booking_cutoff_hours ?? 2,
          buffer_minutes: cp.buffer_minutes ?? 15,
          no_show_policy: cp.no_show_policy ?? '',
          late_cancel_fee_percent: cp.late_cancel_fee_percent ?? 0,
          grace_period_minutes: cp.grace_period_minutes ?? 10,
        });
      }
      setWaitlistForm({
        enabled: studio.waitlist_config?.enabled ?? false,
        max_capacity: studio.waitlist_config?.max_capacity ?? 10,
      });
    }
  }, [studio]);

  // Load notification prefs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notifPrefs');
      if (saved) setNotifPrefs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ---------- Mutations ----------

  const [profileSaveCount, setProfileSaveCount] = useState(0);
  const [studioSaveCount, setStudioSaveCount] = useState(0);

  const profileMutation = useMutation({
    mutationFn: patchProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
      setProfileSaveCount((c) => c + 1);
    },
  });

  const studioMutation = useMutation({
    mutationFn: patchStudio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'studio'] });
      setStudioSaveCount((c) => c + 1);
    },
  });

  // ---------- Handlers ----------

  const handleSaveProfile = () => {
    profileMutation.mutate(profileForm);
  };

  const handleSaveBusiness = () => {
    profileMutation.mutate({ business_name: businessForm.business_name });
    if (isOperator) {
      studioMutation.mutate({ opening_hours: openingHours });
    }
  };

  const handleSaveBooking = () => {
    const effectiveModel = bookingForm.self_booking_enabled
      ? bookingForm.booking_model
      : 'request';
    studioMutation.mutate({
      booking_model: effectiveModel,
      soft_hold_length: bookingForm.soft_hold_length,
      cancellation_window_hours: bookingForm.cancellation_window_hours,
      cancellation_policy: policyForm as CancellationPolicyData,
    });
  };

  const handleSaveWaitlist = () => {
    studioMutation.mutate({
      waitlist_config: { enabled: waitlistForm.enabled, max_capacity: waitlistForm.max_capacity },
    });
  };

  const handleSaveBrandColor = () => {
    profileMutation.mutate({ brand_color: brandColor });
  };

  const updateNotifPref = (key: keyof typeof notifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem('notifPrefs', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load health check status for clients
  useEffect(() => {
    if (!isClient) return;
    const loadHealthCheck = async () => {
      try {
        const response = await fetch('/api/client/health-check');
        const result = await response.json();
        setHealthCheckStatus({
          completed: result.completed,
          valid: result.valid,
          completedAt: result.completedAt,
        });
      } catch (error) {
        console.error('Error loading health check status:', error);
      }
    };
    loadHealthCheck();
  }, [isClient]);

  // ---------- Tab filtering ----------

  const visibleTabs = TABS.filter(
    (tab) => tab.roles.length === 0 || tab.roles.includes(currentRole)
  );

  const visibleComingSoon = COMING_SOON_TABS.filter(
    (tab) => tab.roles.length === 0 || tab.roles.includes(currentRole)
  );

  // ---------- Opening hours helpers ----------

  const toggleDay = (day: string) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        enabled: !(prev[day]?.enabled ?? false),
        slots: prev[day]?.slots || [{ start: '09:00', end: '17:00' }],
      },
    }));
  };

  const updateSlot = (day: string, idx: number, field: 'start' | 'end', value: string) => {
    setOpeningHours((prev) => {
      const dayData = prev[day] || { enabled: true, slots: [] };
      const newSlots = [...dayData.slots];
      newSlots[idx] = { ...newSlots[idx], [field]: value };
      return { ...prev, [day]: { ...dayData, slots: newSlots } };
    });
  };

  // ---------- Warning banner helper ----------

  const hasOpeningHours = Object.values(openingHours).some((d) => d.enabled);

  // ---------- Toggle switch component ----------

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wondrous-blue-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wondrous-magenta" />
    </label>
  );

  // ---------- Section renderers ----------

  const renderBooking = () => (
    <div className="space-y-6">
      <SectionHeader icon={<CalendarClock size={20} />} title="Booking" subtitle="Configure how clients can book sessions" color="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600 dark:text-orange-400" />

      {!hasOpeningHours && !studioLoading && (
        <WarningBanner message="You haven't set opening hours yet. Go to Business Details to configure your availability." />
      )}

      {studioLoading ? <LoadingSpinner /> : (
        <div className="space-y-6">
          {/* Self-booking toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Allow Client Self-Booking</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Clients can book sessions directly from your public page</p>
            </div>
            <ToggleSwitch
              checked={bookingForm.self_booking_enabled}
              onChange={(v) => setBookingForm((f) => ({ ...f, self_booking_enabled: v }))}
            />
          </div>

          {bookingForm.self_booking_enabled && (
            <div>
              <Label>Booking Model</Label>
              <div className="flex gap-2 mt-2">
                {(['instant', 'soft-hold'] as const).map((model) => (
                  <Button
                    key={model}
                    type="button"
                    variant={bookingForm.booking_model === model ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBookingForm((f) => ({ ...f, booking_model: model }))}
                    className={cn(bookingForm.booking_model === model ? 'bg-wondrous-magenta hover:bg-wondrous-magenta-alt' : 'dark:border-gray-600 dark:text-gray-300')}
                  >
                    {model === 'instant' ? 'Instant Confirm' : 'Soft Hold'}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {bookingForm.booking_model === 'instant' && 'Bookings are confirmed immediately without approval'}
                {bookingForm.booking_model === 'soft-hold' && 'Sessions are held temporarily until you confirm'}
              </p>
            </div>
          )}

          {!bookingForm.self_booking_enabled && (
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              Self-booking is off. You will need to create bookings on behalf of your clients manually.
            </p>
          )}

          {bookingForm.self_booking_enabled && bookingForm.booking_model === 'soft-hold' && (
            <div>
              <Label htmlFor="softHold">Soft Hold Duration (minutes)</Label>
              <Input id="softHold" type="number" min={5} max={120} value={bookingForm.soft_hold_length} onChange={(e) => setBookingForm((f) => ({ ...f, soft_hold_length: parseInt(e.target.value) || 30 }))} className="mt-1 w-32" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">How long a soft hold lasts before expiring</p>
            </div>
          )}

          {/* Cancellation & Policies */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Cancellation &amp; Policies</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cancellation">Cancellation Window (hours)</Label>
              <Input id="cancellation" type="number" min={0} max={168} value={bookingForm.cancellation_window_hours} onChange={(e) => setBookingForm((f) => ({ ...f, cancellation_window_hours: parseInt(e.target.value) || 24 }))} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min. hours notice to cancel without penalty</p>
            </div>
            <div>
              <Label htmlFor="cutoff">Booking Cut-off (hours)</Label>
              <Input id="cutoff" type="number" min={0} max={168} value={policyForm.booking_cutoff_hours ?? 2} onChange={(e) => setPolicyForm((f) => ({ ...f, booking_cutoff_hours: parseInt(e.target.value) || 0 }))} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min. advance time to book a session</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buffer">Buffer Between Sessions (min)</Label>
              <Input id="buffer" type="number" min={0} max={120} value={policyForm.buffer_minutes ?? 15} onChange={(e) => setPolicyForm((f) => ({ ...f, buffer_minutes: parseInt(e.target.value) || 0 }))} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gap between consecutive sessions</p>
            </div>
            <div>
              <Label htmlFor="grace">Grace Period (min)</Label>
              <Input id="grace" type="number" min={0} max={60} value={policyForm.grace_period_minutes ?? 10} onChange={(e) => setPolicyForm((f) => ({ ...f, grace_period_minutes: parseInt(e.target.value) || 0 }))} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allowance for late arrivals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lateCancelFee">Late Cancel Fee (%)</Label>
              <Input id="lateCancelFee" type="number" min={0} max={100} value={policyForm.late_cancel_fee_percent ?? 0} onChange={(e) => setPolicyForm((f) => ({ ...f, late_cancel_fee_percent: parseInt(e.target.value) || 0 }))} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">% charged for late cancellations</p>
            </div>
          </div>

          <div>
            <Label htmlFor="noShowPolicy">No-Show Policy</Label>
            <textarea
              id="noShowPolicy"
              value={policyForm.no_show_policy ?? ''}
              onChange={(e) => setPolicyForm((f) => ({ ...f, no_show_policy: e.target.value }))}
              placeholder="e.g. Sessions not attended will be charged in full."
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wondrous-primary dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <SaveButton onClick={handleSaveBooking} loading={studioMutation.isPending} successCount={studioSaveCount} />
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <SectionHeader icon={<User size={20} />} title="Profile Information" subtitle="Update your personal information" color="bg-wondrous-blue-light" iconColor="text-wondrous-dark-blue" />

      {!profileLoading && !profileForm.phone && (
        <WarningBanner message="Adding a phone number helps clients reach you and enables SMS reminders." />
      )}

      {profileLoading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={profileForm.first_name} onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={profileForm.last_name} onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={currentUser.email} disabled className="mt-1 opacity-60" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 900000" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea id="bio" value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell your clients a bit about yourself..." rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-wondrous-primary dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <SaveButton onClick={handleSaveProfile} loading={profileMutation.isPending} successCount={profileSaveCount} />
        </div>
      )}
    </div>
  );

  const renderBusiness = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Building2 size={20} />} title="Business Details" subtitle="Your business name, logo, and opening hours" color="bg-pink-100 dark:bg-pink-900/30" iconColor="text-pink-600 dark:text-pink-400" />

      {!profileLoading && !businessForm.business_name && (
        <WarningBanner message="Set your business name — it appears on your public booking page and in emails to clients." />
      )}

      {(profileLoading || studioLoading) ? <LoadingSpinner /> : (
        <div className="space-y-6">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" value={businessForm.business_name} onChange={(e) => setBusinessForm((f) => ({ ...f, business_name: e.target.value }))} className="mt-1" />
          </div>

          {profile?.business_slug && (
            <div>
              <Label>Booking Page URL</Label>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">allwondrous.com/book/</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{profile.business_slug}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Business Logo</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Appears on your public booking page and in emails</p>
            {isLoadingLogo ? (
              <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-wondrous-magenta rounded-full animate-spin" />
              </div>
            ) : (
              <LogoUpload currentLogo={businessLogo} onLogoChange={setBusinessLogo} />
            )}
          </div>

          {/* Coming Soon: Address, VAT, Insurance */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">Additional Details</p>
            {['Business Address', 'VAT / Tax Number', 'Insurance Details'].map((label) => (
              <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-wondrous-blue-light text-wondrous-dark-blue px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
            ))}
          </div>

          {/* Opening Hours */}
          <div>
            <Label className="text-base font-semibold">Opening Hours</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Set your regular business hours</p>
            <div className="space-y-2">
              {DAY_ORDER.map((day) => {
                const dayData = openingHours[day];
                const isEnabled = dayData?.enabled ?? false;
                return (
                  <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="w-24 flex items-center gap-2">
                      <ToggleSwitch checked={isEnabled} onChange={() => toggleDay(day)} />
                      <span className={cn("text-sm font-medium", isEnabled ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-600")}>
                        {DAY_NAMES[day]?.slice(0, 3)}
                      </span>
                    </div>
                    {isEnabled && dayData?.slots?.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <input type="time" value={slot.start} onChange={(e) => updateSlot(day, idx, 'start', e.target.value)} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100" />
                        <span className="text-gray-400">–</span>
                        <input type="time" value={slot.end} onChange={(e) => updateSlot(day, idx, 'end', e.target.value)} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100" />
                      </div>
                    ))}
                    {!isEnabled && <span className="text-sm text-gray-400 dark:text-gray-600">Closed</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <SaveButton onClick={handleSaveBusiness} loading={profileMutation.isPending || studioMutation.isPending} successCount={profileSaveCount + studioSaveCount} />
        </div>
      )}
    </div>
  );

  const renderWaitlist = () => (
    <div className="space-y-6">
      <SectionHeader icon={<ListCheck size={20} />} title="Waitlist" subtitle="Manage waitlist for fully-booked sessions" color="bg-cyan-100 dark:bg-cyan-900/30" iconColor="text-cyan-600 dark:text-cyan-400" />
      {studioLoading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable Waitlist</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Allow clients to join a waitlist for full sessions</p>
            </div>
            <ToggleSwitch checked={waitlistForm.enabled} onChange={(v) => setWaitlistForm((f) => ({ ...f, enabled: v }))} />
          </div>
          {waitlistForm.enabled && (
            <div>
              <Label htmlFor="maxCapacity">Maximum Waitlist Capacity</Label>
              <Input id="maxCapacity" type="number" min={1} max={100} value={waitlistForm.max_capacity} onChange={(e) => setWaitlistForm((f) => ({ ...f, max_capacity: parseInt(e.target.value) || 10 }))} className="mt-1 w-32" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum number of people on the waitlist per session</p>
            </div>
          )}
          <SaveButton onClick={handleSaveWaitlist} loading={studioMutation.isPending} successCount={studioSaveCount} />
        </div>
      )}
    </div>
  );

  const renderLegal = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Scale size={20} />} title="Legal & Compliance" subtitle="Policies, waivers, and compliance settings" color="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Configure legal agreements and health requirements for your clients.
      </p>
      <div className="space-y-3">
        {[
          { label: 'PAR-Q Health Check Requirement', desc: 'Require clients to complete a health questionnaire before booking' },
          { label: 'Terms of Service URL', desc: 'Link to your terms of service for client acknowledgement' },
          { label: 'Privacy Policy URL', desc: 'Link to your privacy policy' },
          { label: 'Photo / Media Consent', desc: 'Require media consent before sessions' },
        ].map(({ label, desc }) => (
          <div key={label} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-gray-400 shrink-0" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{desc}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-wondrous-blue-light text-wondrous-dark-blue px-2 py-0.5 rounded-full shrink-0">Coming Soon</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Users size={20} />} title="Staff Management" subtitle="Manage your team members and permissions" color="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          View and manage your studio staff from the dedicated staff page.
        </p>
        <Button variant="outline" onClick={() => router.push('/studio-owner/staff')} className="gap-2">
          <Users size={16} />
          Go to Staff Management
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );

  const renderHealth = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Heart size={20} />} title="Health & Safety" subtitle="Your PAR-Q health questionnaire status" color="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
      {healthCheckStatus ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Status</p>
              {healthCheckStatus.completed ? (
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 size={16} className={healthCheckStatus.valid ? 'text-green-500' : 'text-orange-500'} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Completed on {format(new Date(healthCheckStatus.completedAt!), 'dd MMM yyyy')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle size={16} className="text-orange-500" />
                  <p className="text-sm text-orange-600 dark:text-orange-400">Not completed</p>
                </div>
              )}
            </div>
          </div>
          {healthCheckStatus.completed && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Validity</p>
                {healthCheckStatus.valid ? (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Valid until {format(
                      new Date(new Date(healthCheckStatus.completedAt!).getTime() + 6 * 30 * 24 * 60 * 60 * 1000),
                      'dd MMM yyyy'
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    Expired — please update your health check
                  </p>
                )}
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/client/health-check')}>
            <Heart size={16} className="mr-2" />
            {healthCheckStatus.completed ? 'Update Health Check' : 'Complete Health Check'}
          </Button>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Bell size={20} />} title="Notifications" subtitle="Manage your notification preferences" color="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
      <div className="space-y-1">
        {([
          { key: 'email_notifications' as const, label: 'Email Notifications', desc: 'Receive updates via email' },
          { key: 'session_reminders' as const, label: 'Session Reminders', desc: 'Get reminders for upcoming sessions' },
          { key: 'booking_confirmations' as const, label: 'Booking Confirmations', desc: 'Receive booking confirmation emails' },
          { key: 'marketing_updates' as const, label: 'Marketing Updates', desc: 'News, tips, and feature announcements' },
        ]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
            <ToggleSwitch
              checked={notifPrefs[key]}
              onChange={(v) => updateNotifPref(key, v)}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">Changes are saved automatically</p>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Palette size={20} />} title="Appearance" subtitle="Customize your display preferences" color="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Toggle dark mode appearance</p>
        </div>
        <ToggleSwitch checked={darkMode} onChange={toggleDarkMode} />
      </div>

      {isOperator && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <Label className="text-base font-semibold">Brand Colour</Label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Choose your brand accent colour for the public booking page</p>
          <div className="flex flex-wrap gap-3 mb-3">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setBrandColor(color)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  brandColor === color ? "border-gray-900 dark:border-white scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="customColor" className="text-sm whitespace-nowrap">Custom:</Label>
            <input
              type="color"
              id="customColor"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{brandColor}</span>
          </div>
          <div className="mt-3">
            <SaveButton onClick={handleSaveBrandColor} loading={profileMutation.isPending} successCount={profileSaveCount} />
          </div>
        </div>
      )}
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Shield size={20} />} title="Privacy & Security" subtitle="Manage your security settings" color="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600 dark:text-orange-400" />
      <div className="space-y-3">
        <Button variant="outline" className="w-full sm:w-auto">
          <Lock size={16} className="mr-2" />
          Change Password
        </Button>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Two-Factor Authentication</p>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-wondrous-blue-light text-wondrous-dark-blue px-2 py-0.5 rounded-full">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDanger = () => (
    <div className="space-y-6">
      <SectionHeader icon={<Trash2 size={20} />} title="Danger Zone" subtitle="Irreversible actions" color="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full sm:w-auto border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
      >
        <LogOut size={16} className="mr-2" />
        Logout from Account
      </Button>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Trash2 size={16} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delete Account</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-wondrous-blue-light text-wondrous-dark-blue px-2 py-0.5 rounded-full">Coming Soon</span>
        </div>
      </div>
    </div>
  );

  const renderComingSoon = (tab: SettingsTab) => (
    <div className="space-y-6">
      <SectionHeader icon={tab.icon} title={tab.label} subtitle="This feature is under development" color="bg-gray-100 dark:bg-gray-800" iconColor="text-gray-500 dark:text-gray-400" />
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-wondrous-blue-light flex items-center justify-center mb-4">
          <Plug size={28} className="text-wondrous-dark-blue" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Coming Soon</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {tab.id === 'integrations' && 'Google Calendar, WhatsApp, and Zapier integrations are on the way.'}
          {tab.id === 'sms' && 'Automated SMS reminders for upcoming sessions.'}
        </p>
      </div>
    </div>
  );

  // ---------- Section renderer map ----------

  const sectionMap: Record<string, () => React.ReactNode> = {
    booking: renderBooking,
    profile: renderProfile,
    business: renderBusiness,
    waitlist: renderWaitlist,
    legal: renderLegal,
    staff: renderStaff,
    health: renderHealth,
    notifications: renderNotifications,
    appearance: renderAppearance,
    privacy: renderPrivacy,
    danger: renderDanger,
  };

  const allTabs = [...visibleTabs, ...visibleComingSoon];

  return (
    <div className="pt-6 px-4 pb-4 lg:p-8 max-w-7xl mx-auto">
      <ContentHeader context="Manage your account preferences and settings" className="hidden lg:block" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop: Left tab navigation */}
        <nav className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <span className={cn("transition-colors", activeTab === tab.id ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}

            {visibleComingSoon.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Coming Soon</span>
                </div>
                {visibleComingSoon.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left opacity-60',
                      activeTab === tab.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <span className="text-slate-400 dark:text-slate-500">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </nav>

        {/* Mobile: Top scrollable tabs */}
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
          <div className="flex gap-2 min-w-max">
            {allTabs.map((tab) => {
              const isComingSoon = COMING_SOON_TABS.some((cs) => cs.id === tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                    activeTab === tab.id
                      ? 'bg-wondrous-magenta text-white border-wondrous-magenta'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                    isComingSoon && 'opacity-60'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              {sectionMap[activeTab]
                ? sectionMap[activeTab]()
                : renderComingSoon(allTabs.find((t) => t.id === activeTab) || COMING_SOON_TABS[0])
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, subtitle, color, iconColor }: {
  icon: React.ReactNode; title: string; subtitle: string; color: string; iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function WarningBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-wondrous-magenta rounded-full animate-spin" />
    </div>
  );
}

function SaveButton({ onClick, loading, successCount }: { onClick: () => void; loading: boolean; successCount: number }) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (successCount > 0) {
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [successCount]);

  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={onClick} disabled={loading} className="bg-wondrous-magenta hover:bg-wondrous-magenta-alt gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
      {showSuccess && (
        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 size={14} />
          Saved
        </span>
      )}
    </div>
  );
}
