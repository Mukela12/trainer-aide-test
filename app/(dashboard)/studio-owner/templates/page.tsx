"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useTemplateStore } from '@/lib/stores/template-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  FileText,
  Dumbbell,
} from 'lucide-react';

export default function TemplateLibrary() {
  const { templates, deleteTemplate, duplicateTemplate } = useTemplateStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'resistance_only'>('all');

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (templateId: string, templateName: string) => {
    if (confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      deleteTemplate(templateId);
    }
  };

  const handleDuplicate = (templateId: string) => {
    duplicateTemplate(templateId);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        {/* Title Section */}
        <div className="mb-4">
          <h1 className="text-2xl lg:text-heading-1 font-bold text-gray-900 dark:text-gray-100 mb-2">
            Workout Templates
          </h1>
          <p className="text-sm lg:text-body-sm text-gray-600 dark:text-gray-400">
            Create and manage standardized workout templates
          </p>
        </div>

        {/* Action Button - Full width on mobile */}
        <Link href="/studio-owner/templates/builder" className="block lg:inline-block mb-4">
          <Button className="w-full lg:w-auto gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark">
            <Plus size={20} />
            <span>Create New Template</span>
          </Button>
        </Link>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="flex-shrink-0"
            >
              All
            </Button>
            <Button
              variant={filterType === 'standard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('standard')}
              className="flex-shrink-0"
            >
              Standard
            </Button>
            <Button
              variant={filterType === 'resistance_only' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('resistance_only')}
              className="flex-shrink-0"
            >
              Resistance Only
            </Button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredTemplates.map((template) => {
            const totalExercises = template.blocks.reduce(
              (total, block) => total + block.exercises.length,
              0
            );

            return (
              <Card key={template.id} className="flex flex-col dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base lg:text-lg flex-1 dark:text-gray-100">
                      {template.name}
                    </CardTitle>
                    <Badge
                      variant={template.type === 'standard' ? 'default' : 'secondary'}
                      className="flex-shrink-0 text-xs"
                    >
                      {template.type === 'standard' ? '3-Block' : 'Resistance'}
                    </Badge>
                  </div>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 py-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      <FileText size={14} className="flex-shrink-0" />
                      <span>{template.blocks.length} blocks</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      <Dumbbell size={14} className="flex-shrink-0" />
                      <span>{totalExercises} exercises</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">
                        {template.assignedStudios.length} studios
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 border-t dark:border-gray-700 pt-3">
                  <Link href={`/studio-owner/templates/builder?id=${template.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs lg:text-sm dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template.id)}
                    className="gap-1.5 px-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id, template.name)}
                    className="gap-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No templates found' : 'No templates yet'}
          description={
            searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first workout template to get started'
          }
          actionLabel={!searchQuery ? 'Create Template' : undefined}
          onAction={!searchQuery ? () => window.location.href = '/studio-owner/templates/builder' : undefined}
        />
      )}
    </div>
  );
}
