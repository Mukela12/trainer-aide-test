"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  PenTool,
  Wand2,
  ChevronRight,
} from 'lucide-react';
import type { AIProgram } from '@/lib/types/ai-program';
import ContentHeader from '@/components/shared/ContentHeader';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'resistance_only';
  blocks: Array<{ exercises: unknown[] }>;
  assignedStudios: string[];
}

export default function TemplateLibrary() {
  const router = useRouter();
  const { deleteTemplate, duplicateTemplate } = useTemplateStore();
  const { currentUser } = useUserStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [aiTemplates, setAITemplates] = useState<AIProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'resistance_only' | 'ai'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch templates from API on mount
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!currentUser.id) return;

      setIsLoading(true);
      try {
        // Fetch regular templates, AI templates, and all AI programs in parallel
        const [templatesRes, aiTemplatesRes, aiProgramsRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/ai-programs/templates'),
          fetch('/api/ai-programs'),
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

        // Process AI templates (flagged as template)
        let aiTemplatesList: AIProgram[] = [];
        if (aiTemplatesRes.ok) {
          const aiData = await aiTemplatesRes.json();
          aiTemplatesList = aiData.templates || [];
        }

        // Also include AI programs that aren't flagged as templates
        if (aiProgramsRes.ok) {
          const programsData = await aiProgramsRes.json();
          const programs = programsData.programs || [];
          // Merge with templates, avoiding duplicates
          const templateIds = new Set(aiTemplatesList.map((t: AIProgram) => t.id));
          const uniquePrograms = programs.filter((p: AIProgram) => !templateIds.has(p.id));
          aiTemplatesList = [...aiTemplatesList, ...uniquePrograms];
        }

        setAITemplates(aiTemplatesList);
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
      const [aiTemplatesRes, aiProgramsRes] = await Promise.all([
        fetch('/api/ai-programs/templates'),
        fetch('/api/ai-programs'),
      ]);

      let aiTemplatesList: AIProgram[] = [];
      if (aiTemplatesRes.ok) {
        const data = await aiTemplatesRes.json();
        aiTemplatesList = data.templates || [];
      }

      if (aiProgramsRes.ok) {
        const programsData = await aiProgramsRes.json();
        const programs = programsData.programs || [];
        const templateIds = new Set(aiTemplatesList.map((t: AIProgram) => t.id));
        const uniquePrograms = programs.filter((p: AIProgram) => !templateIds.has(p.id));
        aiTemplatesList = [...aiTemplatesList, ...uniquePrograms];
      }

      setAITemplates(aiTemplatesList);
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
      {/* Content Header */}
      <ContentHeader
        context="Create and manage standardized workout templates"
        stats={[
          { label: 'templates', value: templates.length, color: 'primary' },
          { label: 'AI generated', value: aiTemplates.length, color: 'magenta' },
        ]}
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Template</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 lg:mb-8 space-y-3">
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
          onAction={!searchQuery ? () => setShowCreateModal(true) : undefined}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2">
                Create Template
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose how you want to create your workout template
              </p>
            </div>

            <div className="space-y-3">
              {/* Manual Option */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  router.push('/studio-owner/templates/builder');
                }}
                className="w-full p-4 flex items-start gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  <PenTool size={24} className="text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Build Manually
                    </h3>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the template builder to create custom workout blocks and exercises
                  </p>
                </div>
              </button>

              {/* AI Option */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  router.push('/trainer/programs/new');
                }}
                className="w-full p-4 flex items-start gap-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Wand2 size={24} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Generate with AI
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      Recommended
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Let AI create a complete program based on client goals and experience level
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              Both options create templates you can use for client sessions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
