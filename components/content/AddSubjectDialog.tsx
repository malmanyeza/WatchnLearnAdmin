'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Plus, X, Loader2 } from 'lucide-react';
import { subjectOperations, schoolOperations } from '@/lib/database';
import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Teacher {
  name: string;
  email: string;
  phone: string;
  qualification: string;
}

interface School {
  id: string;
  name: string;
}

interface AddSubjectDialogProps {
  trigger: React.ReactNode;
  onSubjectAdded: (subject: any) => void;
}

export function AddSubjectDialog({ trigger, onSubjectAdded }: AddSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '',
    examBoards: [] as string[],
    school_id: '',
    icon: 'BookOpen',
    teachers: [] as Teacher[],
  });
  const [currentTeacher, setCurrentTeacher] = useState<Teacher>({
    name: '',
    email: '',
    phone: '',
    qualification: '',
  });

  const levels = ['JC', 'O-Level', 'A-Level'];
  const examBoards = ['ZIMSEC', 'Cambridge'];

  // Load schools on component mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsData = await schoolOperations.getSchools();
        setSchools(schoolsData || []);
      } catch (error) {
        console.error('Error loading schools:', error);
      }
    };

    if (open) {
      loadSchools();
    }
  }, [open]);

  const handleExamBoardChange = (board: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      examBoards: checked 
        ? [...prev.examBoards, board]
        : prev.examBoards.filter(b => b !== board)
    }));
  };

  const addTeacher = () => {
    if (currentTeacher.name.trim() && currentTeacher.email.trim()) {
      setFormData(prev => ({
        ...prev,
        teachers: [...prev.teachers, currentTeacher]
      }));
      setCurrentTeacher({
        name: '',
        email: '',
        phone: '',
        qualification: '',
      });
    }
  };

  const removeTeacher = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teachers: prev.teachers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create subjects for each selected exam board
      const createdSubjects = [];
      
      for (const examBoard of formData.examBoards) {
        const subjectData = {
          name: formData.name,
          description: formData.description,
          level: formData.level as 'JC' | 'O-Level' | 'A-Level',
          exam_board: examBoard as 'ZIMSEC' | 'Cambridge',
          school_id: formData.school_id === 'none' ? undefined : formData.school_id || undefined,
          teachers: formData.teachers,
        };

        const newSubject = await subjectOperations.createSubject(subjectData);
        createdSubjects.push(newSubject);
      }

      // Notify parent component about the new subjects
      createdSubjects.forEach(subject => {
        onSubjectAdded(subject);
      });

      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating subject:', error);
      setError(error.message || 'Failed to create subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      level: '',
      examBoards: [],
      school_id: '',
      icon: 'BookOpen',
      teachers: [],
    });
    setCurrentTeacher({
      name: '',
      email: '',
      phone: '',
      qualification: '',
    });
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Advanced Mathematics"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select 
                value={formData.level} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">School (Optional)</Label>
            <Select 
              value={formData.school_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, school_id: value }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select school (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific school</SelectItem>
                {schools.map(school => (
                  <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exam Boards *</Label>
            <p className="text-sm text-gray-600">Select one or both exam boards for this subject</p>
            <div className="space-y-2">
              {examBoards.map(board => (
                <div key={board} className="flex items-center space-x-2">
                  <Checkbox
                    id={board}
                    checked={formData.examBoards.includes(board)}
                    onCheckedChange={(checked) => handleExamBoardChange(board, checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor={board}>{board}</Label>
                </div>
              ))}
            </div>
            {formData.examBoards.length > 0 && (
              <div className="flex gap-2 mt-2">
                {formData.examBoards.map(board => (
                  <Badge key={board} variant="outline">{board}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the subject..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Teacher Information Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Subject Teachers</Label>
            
            {/* Current Teachers */}
            {formData.teachers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Added Teachers:</Label>
                <div className="space-y-2">
                  {formData.teachers.map((teacher, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-sm text-gray-600">{teacher.email}</div>
                        {teacher.phone && <div className="text-sm text-gray-500">{teacher.phone}</div>}
                        {teacher.qualification && <div className="text-sm text-gray-500">{teacher.qualification}</div>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeacher(index)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Teacher */}
            <div className="border rounded-lg p-4 space-y-4">
              <Label className="text-sm font-medium">Add Teacher</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherName">Full Name *</Label>
                  <Input
                    id="teacherName"
                    value={currentTeacher.name}
                    onChange={(e) => setCurrentTeacher(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Teacher's full name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherEmail">Email *</Label>
                  <Input
                    id="teacherEmail"
                    type="email"
                    value={currentTeacher.email}
                    onChange={(e) => setCurrentTeacher(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="teacher@school.com"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherPhone">Phone Number</Label>
                  <Input
                    id="teacherPhone"
                    value={currentTeacher.phone}
                    onChange={(e) => setCurrentTeacher(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+263 xxx xxx xxx"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherQualification">Qualification</Label>
                  <Input
                    id="teacherQualification"
                    value={currentTeacher.qualification}
                    onChange={(e) => setCurrentTeacher(prev => ({ ...prev, qualification: e.target.value }))}
                    placeholder="e.g., BSc Mathematics, MSc Education"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button 
                type="button" 
                onClick={addTeacher} 
                size="sm" 
                className="w-full"
                disabled={!currentTeacher.name.trim() || !currentTeacher.email.trim() || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name || !formData.level || formData.examBoards.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Subject'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}