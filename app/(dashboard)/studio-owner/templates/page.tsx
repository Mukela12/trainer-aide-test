"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { AITemplateCard } from '@/components/templates/AITemplateCard';
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  FileText,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { AIProgram } from '@/lib/types/ai-program';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'resistance_only';
  blocks: Array<{ exercises: unknown[] }>;
  assignedStudios: string[];
}

export default function TemplateLibrary() {
  const { deleteTemplate, duplicateTemplate } = useTemplateStore();
  const { currentUser } = useUserStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [aiTemplates, setAITemplates] = useState<AIProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'resistance_only' | 'ai'>('all');

  // Fetch templates from API on mount
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!currentUser.id) return;

      setIsLoading(true);
      try {
        // Fetch both regular templates and AI templates in parallel
        const [templatesRes, aiTemplatesRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/ai-programs/templates'),
        ]);

        // Process regular templates
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          const mappedTemplates = (data.templates || []).map((t: {
            id: string;
            name: string;
            description?: string;
            type?: string;
            json_definition?: Array<{ exercises: unknown[] }>;
            blocks?: Array<{ exercises: unknown[] }>;
            studio_id?: string;
          }) => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            type: t.type || 'standard',
            blocks: t.json_definition || t.blocks || [],
            assignedStudios: t.studio_id ? [t.studio_id] : [],
          }));
          setTemplates(mappedTemplates);
        }

        // Process AI templates
        if (aiTemplatesRes.ok) {
          const aiData = await aiTemplatesRes.json();
          setAITemplates(aiData.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTemplates();
  }, [currentUser.id]);

  // Refresh AI templates
  const refreshAITemplates = async () => {
    try {
      const res = await fetch('/api/ai-programs/templates');
      if (res.ok) {
        const data = await res.json();
        setAITemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error refreshing AI templates:', error);
    }
  };

  // Filter regular templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || filterType === 'ai' || template.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filter AI templates
  const filteredAITemplates = aiTemplates.filter((template) => {
    const matchesSearch = template.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (filterType === 'all' || filterType === 'ai');
  });

  // Combined counts for display
  const totalTemplates = filteredTemplates.length + filteredAITemplates.length;

  const handleDelete = async (templateId: string, templateName: string) => {
    if (confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      await deleteTemplate(templateId);
      // Remove from local state
      setTemplates(templates.filter(t => t.id !== templateId));
    }
  };

  const handleDuplicate = async (templateId: string) => {
    const duplicated = await duplicateTemplate(templateId);
    if (duplicated) {
      // Add to local state
      setTemplates([...templates, {
        id: duplicated.id,
        name: duplicated.name,
        description: duplicated.description,
        type: duplicated.type,
        blocks: duplicated.blocks,
        assignedStudios: duplicated.assignedStudios,
      }]);
    }
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
              All ({templates.length + aiTemplates.length})
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
            <Button
              variant={filterType === 'ai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('ai')}
              className="flex-shrink-0 gap-1"
            >
              <Sparkles size={14} />
              AI Generated ({aiTemplates.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Templates Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalTemplates > 0 ? (
        <div className="space-y-8">
          {/* AI Generated Templates Section */}
          {filteredAITemplates.length > 0 && (filterType === 'all' || filterType === 'ai') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-wondrous-magenta" />
                <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
                  AI Generated Templates
                </h2>
                <Badge variant="secondary" className="ml-2">
                  {filteredAITemplates.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {filteredAITemplates.map((template) => (
                  <AITemplateCard
                    key={template.id}
                    template={template}
                    onUpdate={refreshAITemplates}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Templates Section */}
          {filteredTemplates.length > 0 && filterType !== 'ai' && (
            <div>
              {filteredAITemplates.length > 0 && (filterType === 'all') && (
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                  <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
                    Manual Templates
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {filteredTemplates.length}
                  </Badge>
                </div>
              )}
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
            </div>
          )}
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
