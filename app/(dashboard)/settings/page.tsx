"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Bell, Shield, Palette, LogOut, Building2 } from 'lucide-react';
import ContentHeader from '@/components/shared/ContentHeader';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, currentRole } = useUserStore();
  const { signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  // Check if user can edit business branding (studio owners and solo practitioners only)
  const canEditBranding = currentRole === 'studio_owner' || currentRole === 'solo_practitioner';

  // Load current business logo
  useEffect(() => {
    const loadBusinessLogo = async () => {
      if (!canEditBranding) {
        setIsLoadingLogo(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_logo_url')
          .eq('id', currentUser.id)
          .single();

        if (profile?.business_logo_url) {
          setBusinessLogo(profile.business_logo_url);
        }
      } catch (error) {
        console.error('Error loading business logo:', error);
      } finally {
        setIsLoadingLogo(false);
      }
    };

    loadBusinessLogo();
  }, [canEditBranding, currentUser.id]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());

    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="pt-6 px-4 pb-4 lg:p-8 max-w-7xl mx-auto">
      {/* Content Header */}
      <ContentHeader
        context="Manage your account preferences and settings"
        className="hidden lg:block"
      />

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wondrous-blue-light rounded-lg flex items-center justify-center">
                <User className="text-wondrous-dark-blue" size={20} />
              </div>
              <div>
                <CardTitle>Profile Information</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update your personal information</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={currentUser.firstName}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={currentUser.lastName}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={currentRole.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                disabled
                className="mt-1 capitalize"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Profile information is managed by your system administrator
            </p>
          </CardContent>
        </Card>

        {/* Business Branding - Only for studio owners and solo practitioners */}
        {canEditBranding && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Building2 className="text-pink-600" size={20} />
                </div>
                <div>
                  <CardTitle>Business Branding</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Customize your business logo for public booking and emails
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Logo</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Your logo will appear on your public booking page and in emails sent to clients
                </p>
                {isLoadingLogo ? (
                  <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-wondrous-magenta rounded-full animate-spin" />
                  </div>
                ) : (
                  <LogoUpload
                    currentLogo={businessLogo}
                    onLogoChange={setBusinessLogo}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Recommended: Square image, PNG or JPG, max 5MB
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Bell className="text-green-600" size={20} />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your notification preferences</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receive updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wondrous-blue-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wondrous-magenta"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Session Reminders</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get reminders for upcoming sessions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wondrous-blue-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wondrous-magenta"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Changes are saved automatically
            </p>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="text-orange-600" size={20} />
              </div>
              <div>
                <CardTitle>Privacy & Security</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your security settings</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full sm:w-auto">
              Change Password
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Palette className="text-purple-600" size={20} />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize your display preferences</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toggle dark mode appearance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={darkMode}
                  onChange={(e) => toggleDarkMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wondrous-blue-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wondrous-magenta"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <LogOut className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <div>
                <CardTitle className="text-red-600 dark:text-red-400">Logout</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sign out of your account</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full sm:w-auto border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
            >
              <LogOut size={16} className="mr-2" />
              Logout from Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
