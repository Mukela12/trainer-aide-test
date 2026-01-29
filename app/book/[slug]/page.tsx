'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Users,
  Star,
  ArrowRight,
  Calendar,
  Award,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface TrainerProfile {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  bio: string | null;
  location: string | null;
  yearsExperience: number | null;
  specializations: string[] | null;
  profileImageUrl: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  type: '1-2-1' | 'duet' | 'group';
  maxCapacity: number;
  priceCents: number | null;
  isIntro: boolean;
}

export default function TrainerBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadTrainerAndServices = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Load trainer profile by slug
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, business_name, bio, location, years_experience, specializations, profile_image_url')
        .eq('business_slug', slug)
        .eq('is_onboarded', true)
        .single();

      if (profileError || !profile) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setTrainer({
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        businessName: profile.business_name,
        bio: profile.bio,
        location: profile.location,
        yearsExperience: profile.years_experience,
        specializations: profile.specializations,
        profileImageUrl: profile.profile_image_url,
      });

      // Load public services
      const { data: servicesData } = await supabase
        .from('ta_services')
        .select('id, name, description, duration, type, max_capacity, price_cents, is_intro_session')
        .eq('created_by', profile.id)
        .eq('is_public', true)
        .eq('is_active', true)
        .order('is_intro_session', { ascending: false })
        .order('price_cents', { ascending: true });

      if (servicesData) {
        setServices(
          servicesData.map((s: {
            id: string;
            name: string;
            description: string | null;
            duration: number;
            type: '1-2-1' | 'duet' | 'group';
            max_capacity: number;
            price_cents: number | null;
            is_intro_session: boolean | null;
          }) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            type: s.type,
            maxCapacity: s.max_capacity,
            priceCents: s.price_cents,
            isIntro: s.is_intro_session || false,
          }))
        );
      }

      setIsLoading(false);
    };

    if (slug) {
      loadTrainerAndServices();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !trainer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-gray-400" size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Trainer Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn&apos;t find a trainer with this booking link.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = trainer.businessName || `${trainer.firstName} ${trainer.lastName}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-wondrous-blue to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {trainer.profileImageUrl ? (
                <img
                  src={trainer.profileImageUrl}
                  alt={displayName}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                trainer.firstName[0]
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                {trainer.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {trainer.location}
                  </span>
                )}
                {trainer.yearsExperience && (
                  <span className="flex items-center gap-1">
                    <Award size={16} />
                    {trainer.yearsExperience}+ years experience
                  </span>
                )}
              </div>

              {/* Specializations */}
              {trainer.specializations && trainer.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {trainer.specializations.slice(0, 5).map((spec) => (
                    <span
                      key={spec}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {trainer.bio && (
            <p className="mt-6 text-gray-600 dark:text-gray-400 leading-relaxed">
              {trainer.bio}
            </p>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Book a Session
        </h2>

        {services.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No services available at the moment. Please check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <Card
                key={service.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/book/${slug}/${service.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {service.name}
                        </h3>
                        {service.isIntro && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Free Intro
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {service.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {service.type === '1-2-1'
                            ? '1-on-1'
                            : service.type === 'duet'
                            ? 'Duet (2 people)'
                            : `Group (up to ${service.maxCapacity})`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {service.priceCents === null || service.priceCents === 0
                          ? 'Free'
                          : `£${(service.priceCents / 100).toFixed(0)}`}
                      </div>
                      <Button size="sm">
                        Book Now
                        <ArrowRight className="ml-1" size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Powered by <span className="font-semibold">Trainer Aide</span>
        </div>
      </div>
    </div>
  );
}
