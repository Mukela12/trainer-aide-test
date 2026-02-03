'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ClientService } from '@/lib/types/client-booking';

interface ServiceSelectorProps {
  services: ClientService[];
  selectedService: ClientService | null;
  onSelect: (service: ClientService) => void;
  isLoading?: boolean;
}

export function ServiceSelector({
  services,
  selectedService,
  onSelect,
  isLoading,
}: ServiceSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">No Services Available</p>
          <p className="text-sm">
            There are no bookable services at this time. Please contact your studio.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => {
        const isSelected = selectedService?.id === service.id;

        return (
          <Card
            key={service.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              isSelected
                ? 'ring-2 ring-wondrous-blue border-wondrous-blue'
                : 'hover:border-gray-300 dark:hover:border-gray-600'
            )}
            onClick={() => onSelect(service)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {service.name}
                </h3>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-wondrous-blue flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {service.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Clock size={14} />
                  <span>{service.duration} min</span>
                </div>
                <div className="flex items-center gap-1 text-wondrous-magenta dark:text-pink-400 font-medium">
                  <CreditCard size={14} />
                  <span>
                    {service.creditsRequired} credit{service.creditsRequired !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
