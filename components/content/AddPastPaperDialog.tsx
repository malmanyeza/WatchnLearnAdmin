'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText } from 'lucide-react';

interface AddPastPaperDialogProps {
  trigger: React.ReactNode;
  onPaperAdded: (paper: any) => void;
}

export function AddPastPaperDialog({ trigger, onPaperAdded }: AddPastPaperDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    year: new Date().getFullYear(),
    paperType: '',
    level: '',
    examBoard: '',
    description: '',
    hasMarkingScheme: false,
    file: null as File | null,
    markingSchemeFile: null as File | null,
  });

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography'];
  const levels = ['JC', 'O-Level', 'A-Level'];
  const examBoards = ['ZIMSEC', 'Cambridge'];
  const paperTypes = ['Paper 1', 'Paper 2', 'Paper 3', 'Paper 4', 'Practical'];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPaper = {
      id: Date.now(),
      subject: formData.subject,
      year: formData.year,
      paperType: formData.paperType,
      level: formData.level,
      examBoard: formData.examBoard,
      description: formData.description,
      status: 'published',
      downloadCount: 0,
      hasMarkingScheme: formData.hasMarkingScheme,
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: formData.file ? `${(formData.file.size / (1024 * 1024)).toFixed(1)} MB` : '0 MB',
    };

    onPaperAdded(newPaper);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      year: new Date().getFullYear(),
      paperType: '',
      level: '',
      examBoard: '',
      description: '',
      hasMarkingScheme: false,
      file: null,
      markingSchemeFile: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Past Paper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Select value={formData.year.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paperType">Paper Type *</Label>
              <Select value={formData.paperType} onValueChange={(value) => setFormData(prev => ({ ...prev, paperType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {paperTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}>
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

            <div className="space-y-2">
              <Label htmlFor="examBoard">Exam Board *</Label>
              <Select value={formData.examBoard} onValueChange={(value) => setFormData(prev => ({ ...prev, examBoard: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  {examBoards.map(board => (
                    <SelectItem key={board} value={board}>{board}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional notes about this past paper..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Paper File *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload the question paper (PDF format recommended)
                </p>
                <Input
                  type="file"
                  onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="paper-file"
                />
                <Button type="button" variant="outline" onClick={() => document.getElementById('paper-file')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                {formData.file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {formData.file.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasMarkingScheme"
                checked={formData.hasMarkingScheme}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasMarkingScheme: checked as boolean }))}
              />
              <Label htmlFor="hasMarkingScheme">This paper has a marking scheme</Label>
            </div>

            {formData.hasMarkingScheme && (
              <div className="space-y-2">
                <Label>Marking Scheme File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload the marking scheme (PDF format recommended)
                  </p>
                  <Input
                    type="file"
                    onChange={(e) => setFormData(prev => ({ ...prev, markingSchemeFile: e.target.files?.[0] || null }))}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    id="marking-scheme-file"
                  />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('marking-scheme-file')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  {formData.markingSchemeFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {formData.markingSchemeFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.subject || !formData.paperType || !formData.level || !formData.examBoard || !formData.file}
            >
              Add Past Paper
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}