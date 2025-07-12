'use client';

import React,{ useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, X, Loader2, FileText, Video, HelpCircle, BookOpen, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { quizOperations, QuizQuestion } from '@/lib/quiz';

interface Subject {
  id: string;
  name: string;
  level: string;
  exam_board: string;
  terms: Term[];
}

interface Term {
  id: string;
  title: string;
  order_number: number;
  weeks: Week[];
}

interface Week {
  id: string;
  title: string;
  order_number: number;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  order_number: number;
  content: any[];
}

interface AddContentDialogProps {
  trigger: React.ReactNode;
  onContentAdded: (content: any) => void;
  subjects?: Subject[];
}

const contentTypes = [
  { value: 'video', label: 'Video', icon: Video, accept: '.mp4,.mov,.avi,.mkv,.webm' },
  { value: 'pdf', label: 'PDF Document', icon: FileText, accept: '.pdf' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, accept: '.json,.txt' },
  { value: 'notes', label: 'Notes', icon: BookOpen, accept: '.pdf,.doc,.docx,.txt' },
];

export function AddContentDialog({ trigger, onContentAdded, subjects: propSubjects }: AddContentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState({
    subjectId: '',
    termId: '',
    weekId: '',
    chapterId: '',
    newChapterTitle: '',
    position: 1,
    title: '',
    type: '',
    description: '',
    estimatedDuration: '',
    tags: [] as string[],
    file: null as File | null,
  });
  const [currentTag, setCurrentTag] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isNewChapter, setIsNewChapter] = useState(false);

  // Quiz-specific state
  const [quizMethod, setQuizMethod] = useState<'ai' | 'upload' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    id: '',
    question_text: '',
    answer_a: '',
    answer_b: '',
    answer_c: '',
    answer_d: '',
    correct_answer: 'A',
    points: 1
  });

  // Load subjects when dialog opens
  useEffect(() => {
    const loadSubjects = async () => {
      if (propSubjects) {
        setSubjects(propSubjects);
      } else {
        try {
          const subjectsData = await subjectOperations.getSubjects();
          setSubjects(subjectsData || []);
        } catch (error) {
          console.error('Error loading subjects:', error);
          setError('Failed to load subjects');
        }
      }
    };

    if (open) {
      loadSubjects();
    }
  }, [open, propSubjects]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (formData.subjectId) {
      const subject = subjects.find(s => s.id === formData.subjectId);
      setSelectedSubject(subject || null);
      setFormData(prev => ({ ...prev, termId: '', weekId: '', chapterId: '', position: 1 }));
      setSelectedTerm(null);
      setSelectedWeek(null);
      setSelectedChapter(null);
    }
  }, [formData.subjectId, subjects]);

  useEffect(() => {
    if (formData.termId && selectedSubject) {
      const term = selectedSubject.terms.find(t => t.id === formData.termId);
      setSelectedTerm(term || null);
      setFormData(prev => ({ ...prev, weekId: '', chapterId: '', position: 1 }));
      setSelectedWeek(null);
      setSelectedChapter(null);
    }
  }, [formData.termId, selectedSubject]);

  useEffect(() => {
    if (formData.weekId && selectedTerm) {
      const week = selectedTerm.weeks.find(w => w.id === formData.weekId);
      setSelectedWeek(week || null);
      setFormData(prev => ({ ...prev, chapterId: '', position: 1 }));
      setSelectedChapter(null);
    }
  }, [formData.weekId, selectedTerm]);

  useEffect(() => {
    if (formData.chapterId && selectedWeek) {
      const chapter = selectedWeek.chapters.find(c => c.id === formData.chapterId);
      setSelectedChapter(chapter || null);
      // Set default position to be after the last topic
      if (chapter) {
        setFormData(prev => ({ ...prev, position: chapter.content.length + 1 }));
      }
    }
  }, [formData.chapterId, selectedWeek]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let chapterId = formData.chapterId;

      // Create new chapter if needed
      if (isNewChapter && formData.newChapterTitle.trim()) {
        if (!selectedWeek) {
          throw new Error('Week must be selected to create a new chapter');
        }

        const newChapter = await contentOperations.createChapter({
          week_id: selectedWeek.id,
          title: formData.newChapterTitle,
          order_number: selectedWeek.chapters.length + 1,
        });

        chapterId = newChapter.id;
      }

      if (!chapterId) {
        throw new Error('Chapter must be selected or created');
      }

      // Handle file upload if file is provided
      let fileUrl = '';
      let fileSize = 0;

      let quizData = null;

      if (formData.file) {
        setUploadProgress(25);
        
        // Validate file type and size
        const fileConfig = storageOperations.getFileTypeConfig(formData.type);
        const validation = storageOperations.validateFile(
          formData.file, 
          fileConfig.allowedTypes, 
          fileConfig.maxSizeMB
        );

        if (!validation.valid) {
          throw new Error(validation.error);
        }

        setUploadProgress(50);

        // Generate a temporary content ID for file naming
        const tempContentId = `temp-${Date.now()}`;
        
        // Upload file to Supabase Storage
        const uploadResult = await storageOperations.uploadContentFile(
          formData.file,
          tempContentId,
          formData.type
        );

        fileUrl = uploadResult.url;
        fileSize = uploadResult.size;

        setUploadProgress(75);
      }

      // Handle quiz data based on method
      if (formData.type === 'quiz') {
        if (quizMethod === 'ai') {
          quizData = {
            method: 'ai',
            prompt: aiPrompt,
            generated: false // Will be processed later
          };
        } else if (quizMethod === 'upload') {
          quizData = {
            method: 'upload',
            fileUrl: fileUrl
          };
        } else if (quizMethod === 'manual') {
          quizData = {
            method: 'manual',
            totalQuestions: questions.length,
            totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
            hasImages: questions.some(q => 
              q.question_image_url || 
              q.answer_a_image_url || 
              q.answer_b_image_url || 
              q.answer_c_image_url || 
              q.answer_d_image_url
            )
          };
        }
      }

      // Create the content record
      const newContent = await contentOperations.createContent({
        chapter_id: chapterId,
        title: formData.title,
        type: formData.type as 'video' | 'pdf' | 'quiz' | 'notes',
        description: formData.description || undefined,
        duration: formData.estimatedDuration || undefined,
        estimated_study_time: formData.estimatedDuration || undefined,
        order_number: formData.position,
        tags: formData.tags,
        file_url: fileUrl || undefined,
        file_size: fileSize || undefined,
        quiz_data: quizData,
        created_by: user?.id,
      });

      // If manual quiz, create the questions in the database
      if (formData.type === 'quiz' && quizMethod === 'manual' && questions.length > 0) {
        await quizOperations.createQuestionsFromData(newContent.id, questions.map(q => ({
          ...q,
          content_id: newContent.id
        })));
      }

      setUploadProgress(100);

      onContentAdded(newContent);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating content:', error);
      setError(error.message || 'Failed to create content. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      subjectId: '',
      termId: '',
      weekId: '',
      chapterId: '',
      newChapterTitle: '',
      position: 1,
      title: '',
      type: '',
      description: '',
      estimatedDuration: '',
      tags: [],
      file: null,
    });
    setCurrentTag('');
    setSelectedSubject(null);
    setSelectedTerm(null);
    setSelectedWeek(null);
    setSelectedChapter(null);
    setIsNewChapter(false);
    setQuizMethod('ai');
    setAiPrompt('');
    setQuestions([]);
    setCurrentQuestion({
      id: '',
      question_text: '',
      answer_a: '',
      answer_b: '',
      answer_c: '',
      answer_d: '',
      correct_answer: 'A',
      points: 1
    });
    setError(null);
    setUploadProgress(0);
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getSelectedContentType = () => {
    return contentTypes.find(type => type.value === formData.type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file && formData.type) {
      // Validate file immediately
      const fileConfig = storageOperations.getFileTypeConfig(formData.type);
      const validation = storageOperations.validateFile(
        file, 
        fileConfig.allowedTypes, 
        fileConfig.maxSizeMB
      );

      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      
      setError(null);
    }
    
    setFormData(prev => ({ ...prev, file }));
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, file: null }));
    setError(null);
  };

  // Quiz question management
  const addQuestion = () => {
    if (!currentQuestion.question_text?.trim() || !currentQuestion.answer_a?.trim() || !currentQuestion.answer_b?.trim()) {
      setError('Please fill in the question text and at least two answers');
      return;
    }

    const newQuestion: QuizQuestion = {
      ...currentQuestion,
      id: `q-${Date.now()}`,
      content_id: '',
      order_number: questions.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as QuizQuestion;

    setQuestions(prev => [...prev, newQuestion]);
    setCurrentQuestion({
      id: '',
      question_text: '',
      answer_a: '',
      answer_b: '',
      answer_c: '',
      answer_d: '',
      correct_answer: 'A',
      points: 1
    });
    setError(null);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleQuestionImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image file
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        setError('Please select a valid image file (JPG, PNG, GIF, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image file size must be less than 5MB');
        return;
      }

      try {
        // Upload image using quiz operations
        const imageUrl = await quizOperations.uploadQuizImage(file, `temp-${Date.now()}`, 'question');
        setCurrentQuestion(prev => ({
          ...prev,
          question_image_url: imageUrl
        }));
        setError(null);
      } catch (error: any) {
        console.error('Error uploading question image:', error);
        setError(error.message || 'Failed to upload image');
      }
    }
  };

  const removeQuestionImage = async () => {
    if (currentQuestion.question_image_url) {
      try {
        await quizOperations.deleteQuizImage(currentQuestion.question_image_url);
      } catch (error) {
        console.warn('Failed to delete image:', error);
      }
    }
    setCurrentQuestion(prev => ({
      ...prev,
      question_image_url: undefined
    }));
  };

  const handleAnswerImageChange = async (e: React.ChangeEvent<HTMLInputElement>, answerKey: 'A' | 'B' | 'C' | 'D') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await quizOperations.uploadQuizImage(file, `temp-${Date.now()}`, `answer_${answerKey.toLowerCase()}` as any);
        setCurrentQuestion(prev => ({
          ...prev,
          [`answer_${answerKey.toLowerCase()}_image_url`]: imageUrl
        }));
        setError(null);
      } catch (error: any) {
        console.error('Error uploading answer image:', error);
        setError(error.message || 'Failed to upload image');
      }
    }
  };

  const removeAnswerImage = async (answerKey: 'A' | 'B' | 'C' | 'D') => {
    const imageUrlKey = `answer_${answerKey.toLowerCase()}_image_url` as keyof typeof currentQuestion;
    const imageUrl = currentQuestion[imageUrlKey] as string;
    
    if (imageUrl) {
      try {
        await quizOperations.deleteQuizImage(imageUrl);
      } catch (error) {
        console.warn('Failed to delete image:', error);
      }
    }
    
    setCurrentQuestion(prev => ({
      ...prev,
      [imageUrlKey]: undefined
    }));
  };

  const renderAnswerImageUpload = (answerKey: 'A' | 'B' | 'C' | 'D') => {
    const imageUrlKey = `answer_${answerKey.toLowerCase()}_image_url` as keyof typeof currentQuestion;
    const hasImage = !!currentQuestion[imageUrlKey];

    return (
      <div className="mt-2">
        <Label className="text-xs">Answer {answerKey} Image (Optional)</Label>
        <div className="border border-dashed border-gray-300 rounded p-2 text-center">
          {hasImage ? (
            <div className="space-y-2">
              <img 
                src={currentQuestion[imageUrlKey] as string} 
                alt={`Answer ${answerKey}`}
                className="max-w-full max-h-20 object-contain mx-auto rounded border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeAnswerImage(answerKey)}
                disabled={loading}
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <>
              <Input
                type="file"
                onChange={(e) => handleAnswerImageChange(e, answerKey)}
                accept=".jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                id={`answer-${answerKey}-image`}
                disabled={loading}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById(`answer-${answerKey}-image`)?.click()}
                disabled={loading}
              >
                <Upload className="h-3 w-3 mr-1" />
                Add Image
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Content</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Selection */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select 
              value={formData.subjectId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subjectId: value }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.level} - {subject.exam_board})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && (
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{selectedSubject.level}</Badge>
                <Badge variant="outline">{selectedSubject.exam_board}</Badge>
              </div>
            )}
          </div>

          {/* Term Selection */}
          {selectedSubject && (
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Select 
                value={formData.termId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, termId: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubject.terms
                    .sort((a, b) => a.order_number - b.order_number)
                    .map(term => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Week Selection */}
          {selectedTerm && (
            <div className="space-y-2">
              <Label htmlFor="week">Week *</Label>
              <Select 
                value={formData.weekId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, weekId: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTerm.weeks
                    .sort((a, b) => a.order_number - b.order_number)
                    .map(week => (
                      <SelectItem key={week.id} value={week.id}>
                        {week.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chapter Selection */}
          {formData.weekId && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chapter *</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="existing-chapter"
                      name="chapter-type"
                      checked={!isNewChapter}
                      onChange={() => setIsNewChapter(false)}
                      disabled={loading}
                    />
                    <Label htmlFor="existing-chapter">Use existing chapter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="new-chapter"
                      name="chapter-type"
                      checked={isNewChapter}
                      onChange={() => setIsNewChapter(true)}
                      disabled={loading}
                    />
                    <Label htmlFor="new-chapter">Create new chapter</Label>
                  </div>
                </div>
              </div>

              {!isNewChapter ? (
                selectedWeek && selectedWeek.chapters.length > 0 ? (
                  <div className="space-y-2">
                    <Select 
                      value={formData.chapterId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, chapterId: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedWeek.chapters
                          .sort((a, b) => a.order_number - b.order_number)
                          .map(chapter => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              {chapter.title} ({chapter.content.length} topics)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    No existing chapters for this week. Please create a new chapter.
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <Input
                    value={formData.newChapterTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, newChapterTitle: e.target.value }))}
                    placeholder="Enter new chapter title"
                    required={isNewChapter}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          )}

          {/* Position Input */}
          {(selectedChapter || isNewChapter) && (
            <div className="space-y-2">
              <Label htmlFor="position">Position in Chapter</Label>
              <Input
                id="position"
                type="number"
                min="1"
                max={selectedChapter ? selectedChapter.content.length + 1 : 1}
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 1 }))}
                placeholder="Enter position number"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                {selectedChapter 
                  ? `Enter a number between 1 and ${selectedChapter.content.length + 1}. Current topics: ${selectedChapter.content.length}`
                  : 'This will be the first topic in the new chapter'
                }
              </p>
            </div>
          )}

          {/* Content Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Content Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Introduction to Hydrocarbons"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Content Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value, file: null }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the content..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Estimated Duration</Label>
            <Input
              id="duration"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
              placeholder="e.g., 15 minutes"
              disabled={loading}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                disabled={loading}
              />
              <Button type="button" onClick={addTag} size="sm" disabled={loading || !currentTag.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeTag(tag)} 
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* File Upload */}
          {/* Quiz Creation Section */}
          {formData.type === 'quiz' ? (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Quiz Creation Method</Label>
              
              