'use client';

/**
 * Create Project Dialog
 * Form for creating new projects/campaigns
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createProjectSchema, type CreateProjectFormData } from '@/lib/utils/validation';
import { createProject } from '@/lib/api/projects';

interface CreateProjectDialogProps {
  onProjectCreated?: (project: any) => void;
}

export function CreateProjectDialog({ onProjectCreated }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema)
  });

  const onSubmit = async (data: CreateProjectFormData) => {
    setIsSubmitting(true);

    try {
      // Create project via API
      const project = await createProject(data);

      // Close dialog and reset form
      setOpen(false);
      reset();

      // Notify parent with the created project
      if (onProjectCreated) {
        onProjectCreated(project);
      }
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert(`Failed to create project: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your prospecting campaigns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Philly Italian Restaurants - Jan 2025"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Targeting 4+ star Italian restaurants in Philadelphia area..."
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Budget Limit */}
            <div className="space-y-2">
              <Label htmlFor="budget_limit">Budget Limit (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="budget_limit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500.00"
                  className="pl-7"
                  {...register('budget_limit', { valueAsNumber: true })}
                />
              </div>
              {errors.budget_limit && (
                <p className="text-sm text-destructive">{errors.budget_limit.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Set a budget limit to track costs for this project
              </p>
            </div>

            {/* Budget Alert Threshold */}
            <div className="space-y-2">
              <Label htmlFor="budget_alert_threshold">
                Budget Alert Threshold (%)
              </Label>
              <Input
                id="budget_alert_threshold"
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="80"
                {...register('budget_alert_threshold', { valueAsNumber: true })}
              />
              {errors.budget_alert_threshold && (
                <p className="text-sm text-destructive">
                  {errors.budget_alert_threshold.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Get alerted when you reach this percentage of your budget
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectDialog;
