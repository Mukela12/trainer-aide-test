"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useExerciseLookup } from '@/lib/hooks/use-exercise';
import { Exercise, MuscleGroup } from '@/lib/types';
import { Search, Dumbbell, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

export interface ExerciseCustomParams {
  resistanceValue?: number;
  repsMin?: number;
  repsMax?: number;
  sets?: number;
  cardioDuration?: number;
  cardioIntensity?: number;
}

interface ExerciseLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise, params: ExerciseCustomParams) => void;
  filterCardioOnly?: boolean;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'cardio',
  'chest',
  'back',
  'legs',
  'core',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'full_body',
  'stretch',
];

export function ExerciseLibrary({
  open,
  onClose,
  onSelect,
  filterCardioOnly = false,
}: ExerciseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    instructions: false,
    mistakes: false,
    modifications: false,
  });

  // Customization parameters with intelligent defaults
  const [resistanceValue, setResistanceValue] = useState(20);
  const [repsMin, setRepsMin] = useState(10);
  const [repsMax, setRepsMax] = useState(15);
  const [sets, setSets] = useState(2);
  const [cardioDuration, setCardioDuration] = useState(180); // 3 minutes in seconds
  const [cardioIntensity, setCardioIntensity] = useState(7);

  const { exercises: allExercises } = useExerciseLookup();

  const filteredExercises = allExercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory;
    const matchesCardioFilter = !filterCardioOnly || exercise.category === 'cardio';
    return matchesSearch && matchesCategory && matchesCardioFilter;
  });

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);

    // Set intelligent defaults based on exercise category
    if (exercise.category === 'cardio') {
      setCardioDuration(180); // 3 minutes
      setCardioIntensity(7);
    } else if (exercise.category === 'stretch') {
      setCardioDuration(30); // 30 seconds
      setCardioIntensity(2);
    } else {
      // Resistance exercises
      setResistanceValue(20);
      setRepsMin(10);
      setRepsMax(15);
      setSets(2);
    }
  };

  const handleConfirmAdd = () => {
    if (!selectedExercise) return;

    const params: ExerciseCustomParams = {
      resistanceValue,
      repsMin,
      repsMax,
      sets,
      cardioDuration,
      cardioIntensity,
    };

    onSelect(selectedExercise, params);
    setSelectedExercise(null);
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleBack = () => {
    setSelectedExercise(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[85vh] sm:max-h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedExercise && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft size={18} />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle>
                {selectedExercise ? `Customize ${selectedExercise.name}` : 'Exercise Library'}
              </DialogTitle>
              <DialogDescription>
                {selectedExercise
                  ? 'Set the default parameters for this exercise'
                  : filterCardioOnly
                  ? 'Select a cardio exercise (required for first position)'
                  : 'Browse and select exercises for your template'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!selectedExercise ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filters */}
            {!filterCardioOnly && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </Button>
                {MUSCLE_GROUPS.map((group) => (
                  <Button
                    key={group}
                    variant={selectedCategory === group ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(group)}
                    className="capitalize"
                  >
                    {group}
                  </Button>
                ))}
              </div>
            )}

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-wondrous-blue hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                  onClick={() => handleSelectExercise(exercise)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</h3>
                        <Badge variant="outline" className="capitalize">
                          {exercise.category}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {exercise.level}
                        </Badge>
                      </div>
                      {exercise.equipment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Equipment: {exercise.equipment}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {exercise.instructions[0]}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleSelectExercise(exercise)} className="flex-shrink-0">
                      Customize
                    </Button>
                  </div>
                </div>
              ))}

              {filteredExercises.length === 0 && (
                <div className="text-center py-12">
                  <Dumbbell className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-500 dark:text-gray-400">No exercises found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Customization Panel */
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Exercise Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedExercise.name}</h3>
                <Badge variant="outline" className="capitalize">
                  {selectedExercise.category}
                </Badge>
              </div>
              {selectedExercise.equipment && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Equipment: {selectedExercise.equipment}
                </p>
              )}
            </div>

            {/* Muscle Groups Display */}
            {(selectedExercise.primaryMuscles || selectedExercise.secondaryMuscles) && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
                  Muscles Worked
                </h5>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {selectedExercise.primaryMuscles && (
                    <li className="flex items-start">
                      <span className="font-medium mr-2">Primary:</span>
                      <span>{selectedExercise.primaryMuscles}</span>
                    </li>
                  )}
                  {selectedExercise.secondaryMuscles && (
                    <li className="flex items-start">
                      <span className="font-medium mr-2">Secondary:</span>
                      <span>{selectedExercise.secondaryMuscles}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Form Cues - Red Traffic Light */}
            {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('instructions')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Form Cues
                    </span>
                  </div>
                  {expandedSections.instructions ? (
                    <ChevronUp size={18} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                {expandedSections.instructions && (
                  <div className="px-3 pb-3 pt-1">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {selectedExercise.instructions.map((instruction, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Common Mistakes - Amber Traffic Light */}
            {selectedExercise.commonMistakes && selectedExercise.commonMistakes.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('mistakes')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Common Mistakes
                    </span>
                  </div>
                  {expandedSections.mistakes ? (
                    <ChevronUp size={18} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                {expandedSections.mistakes && (
                  <div className="px-3 pb-3 pt-1">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {selectedExercise.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modifications - Green Traffic Light */}
            {selectedExercise.modifications && selectedExercise.modifications.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('modifications')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Modifications
                    </span>
                  </div>
                  {expandedSections.modifications ? (
                    <ChevronUp size={18} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                {expandedSections.modifications && (
                  <div className="px-3 pb-3 pt-1">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {selectedExercise.modifications.map((mod, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                          <span>{mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Parameter Inputs */}
            {selectedExercise.category === 'cardio' ? (
              /* Cardio Parameters */
              <div className="space-y-4">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={Math.floor(cardioDuration / 60)}
                    onChange={(e) => setCardioDuration(parseInt(e.target.value) * 60 || 0)}
                    min={1}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How long should clients perform this exercise
                  </p>
                </div>
                <div>
                  <Label>Intensity (1-10)</Label>
                  <Input
                    type="number"
                    value={cardioIntensity}
                    onChange={(e) => setCardioIntensity(parseInt(e.target.value) || 0)}
                    min={1}
                    max={10}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    1 = Very light, 10 = Maximum effort
                  </p>
                </div>
              </div>
            ) : selectedExercise.category === 'stretch' ? (
              /* Stretch Parameters */
              <div className="space-y-4">
                <div>
                  <Label>Hold Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={cardioDuration}
                    onChange={(e) => setCardioDuration(parseInt(e.target.value) || 0)}
                    min={1}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How long should clients hold this stretch
                  </p>
                </div>
              </div>
            ) : (
              /* Resistance Parameters */
              <div className="space-y-4">
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={resistanceValue}
                    onChange={(e) => setResistanceValue(parseInt(e.target.value) || 0)}
                    min={0}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default weight for this exercise
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Min Reps</Label>
                    <Input
                      type="number"
                      value={repsMin}
                      onChange={(e) => setRepsMin(parseInt(e.target.value) || 0)}
                      min={1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Max Reps</Label>
                    <Input
                      type="number"
                      value={repsMax}
                      onChange={(e) => setRepsMax(parseInt(e.target.value) || 0)}
                      min={1}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Sets</Label>
                  <Input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(parseInt(e.target.value) || 0)}
                    min={1}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Number of sets to perform
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedExercise.category === 'cardio' ? (
                  `${Math.floor(cardioDuration / 60)} min • Intensity ${cardioIntensity}/10`
                ) : selectedExercise.category === 'stretch' ? (
                  `${cardioDuration}s hold`
                ) : (
                  `${resistanceValue}kg • ${repsMin}-${repsMax} reps • ${sets} sets`
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 pb-20 lg:pb-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirmAdd} className="flex-1">
                Add Exercise
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
