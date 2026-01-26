"use client";

import { useState } from 'react';
import { useServiceStore } from '@/lib/stores/service-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Service, ServiceDuration, ServiceType } from '@/lib/types/service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ServiceFormDialog } from '@/components/studio-owner/ServiceFormDialog';
import { Clock, Plus, Edit, Power, PowerOff, Users, User, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function ServicesPage() {
  const { services, addService, updateService } = useServiceStore();
  const { currentUser } = useUserStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const activeServices = services.filter(s => s.isActive);
  const inactiveServices = services.filter(s => !s.isActive);

  const getTypeIcon = (type: ServiceType) => {
    switch (type) {
      case '1-2-1':
        return <User size={16} />;
      case 'duet':
        return <Users size={16} />;
      case 'group':
        return <UsersRound size={16} />;
    }
  };

  const getTypeLabel = (type: ServiceType) => {
    switch (type) {
      case '1-2-1':
        return '1-on-1';
      case 'duet':
        return 'Duet';
      case 'group':
        return 'Group';
    }
  };

  const toggleServiceStatus = (serviceId: string, currentStatus: boolean) => {
    updateService(serviceId, { isActive: !currentStatus });
  };

  const handleAddNew = () => {
    setSelectedService(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setIsDialogOpen(true);
  };

  const handleSaveService = (service: Service) => {
    // Update service with current user ID
    const serviceWithUser = {
      ...service,
      createdBy: service.createdBy === 'user_owner_1' ? currentUser.id : service.createdBy,
    };

    if (selectedService) {
      // Editing existing service
      updateService(serviceWithUser.id, serviceWithUser);
    } else {
      // Adding new service
      addService(serviceWithUser);
    }

    setIsDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        {/* Title Section */}
        <div className="mb-4">
          <h1 className="text-2xl lg:text-heading-1 font-bold text-gray-900 dark:text-gray-100 mb-2">
            Services
          </h1>
          <p className="text-sm lg:text-body-sm text-gray-600 dark:text-gray-400">
            Manage session types that trainers can book
          </p>
        </div>

        {/* Action Button - Full width on mobile */}
        <Button
          onClick={handleAddNew}
          className="w-full lg:w-auto mb-4 gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
        >
          <Plus size={20} />
          <span>Add New Service</span>
        </Button>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-start gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm lg:text-base text-gray-900 dark:text-gray-100 mb-1">
                  What are Services?
                </h3>
                <p className="text-xs lg:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Services define session types (e.g., &quot;30min PT Session&quot;). They specify duration, type (1-on-1, duet, group), and credits.
                  Different from <span className="font-medium">Templates</span>, which are workout programs with exercises.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Services */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
          Active Services ({activeServices.length})
        </h2>

        {activeServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {activeServices.map((service) => (
              <Card
                key={service.id}
                className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                        <CardTitle className="text-base lg:text-lg dark:text-gray-100 truncate">
                          {service.name}
                        </CardTitle>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  {/* Service Details */}
                  <div className="space-y-2 lg:space-y-3 mb-3 lg:mb-4">
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Duration</span>
                      <Badge variant="outline" className="dark:border-gray-600 text-xs">
                        <Clock size={12} className="mr-1" />
                        {service.duration} min
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Type</span>
                      <Badge variant="outline" className="dark:border-gray-600 text-xs">
                        {getTypeIcon(service.type)}
                        <span className="ml-1">{getTypeLabel(service.type)}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Capacity</span>
                      <span className="font-medium dark:text-gray-200">{service.maxCapacity}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Credits</span>
                      <span className="font-medium text-wondrous-magenta">{service.creditsRequired}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                      className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 text-xs"
                    >
                      <Edit size={14} className="mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleServiceStatus(service.id, service.isActive)}
                      className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20 text-xs"
                    >
                      <PowerOff size={14} className="mr-1" />
                      <span>Disable</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No active services"
            description="Create your first service to get started"
          />
        )}
      </div>

      {/* Inactive Services */}
      {inactiveServices.length > 0 && (
        <div>
          <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
            Inactive Services ({inactiveServices.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {inactiveServices.map((service) => (
              <Card
                key={service.id}
                className="opacity-60 hover:opacity-100 transition-opacity dark:bg-gray-800 dark:border-gray-700"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                        <CardTitle className="text-base lg:text-lg dark:text-gray-100 truncate">
                          {service.name}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="mb-2 text-xs">Inactive</Badge>
                      <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  {/* Service Details */}
                  <div className="space-y-2 mb-3 lg:mb-4 text-xs lg:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration</span>
                      <span className="font-medium dark:text-gray-300">{service.duration} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Type</span>
                      <span className="font-medium dark:text-gray-300">{getTypeLabel(service.type)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleServiceStatus(service.id, service.isActive)}
                    className="w-full border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 text-xs"
                  >
                    <Power size={14} className="mr-1" />
                    <span>Enable</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Service Form Dialog */}
      <ServiceFormDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSaveService}
        service={selectedService}
      />
    </div>
  );
}
