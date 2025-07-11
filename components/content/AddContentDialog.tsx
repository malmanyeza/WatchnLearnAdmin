'use client';

import React,{ useState, useEffect } from 'react';
import { storageOperations } from '@/lib/storage';
import { contentOperations, subjectOperations } from '@/lib/database';
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

interface Question {
  id: string;
  text: string;
  image?: File;
  imagePreview?: string;
  answers: {
    A: { text: string; image?: File; imagePreview?: string };
    B: { text: string; image?: File; imagePreview?: string };
    C: { text: string; image?: File; imagePreview?: string };
    D: { text: string; image?: File; imagePreview?: string };
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    text: '',
    answers: { 
      A: { text: '' }, B: { text: '' }, 
      C: { text: '' }, D: { text: '' } 
    },
    correctAnswer: 'A'
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

    // Capture current questions snapshot
    const submitQuestions = [...questions];

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

      let createdContent;

      // Handle quiz data based on method
      if (formData.type === 'quiz') {
        if (quizMethod === 'ai') {
          quizData = {
            method: 'ai',
            prompt: aiPrompt,
            generated: false, // Will be processed later
            questions: [],
            totalQuestions: 0,
            hasImages: false
          };
        } else if (quizMethod === 'upload') {
          quizData = {
            method: 'upload',
            fileUrl: fileUrl,
            questions: [],
            totalQuestions: 0,
            hasImages: false
          };
        } else if (quizMethod === 'manual') {
          console.log(submitQuestions)
          // Process questions to include in quiz_data
          const processedQuestions = submitQuestions.map((question, index) => ({
            id: question.id,
            text: question.text,
            imageUrl: question.imagePreview ? '' : undefined, // Will be updated after image upload
            answers: {
              A: {
                text: question.answers.A.text,
                imageUrl: question.answers.A.imagePreview ? '' : undefined
              },
              B: {
                text: question.answers.B.text,
                imageUrl: question.answers.B.imagePreview ? '' : undefined
              },
              C: question.answers.C.text ? {
                text: question.answers.C.text,
                imageUrl: question.answers.C.imagePreview ? '' : undefined
              } : undefined,
              D: question.answers.D.text ? {
                text: question.answers.D.text,
                imageUrl: question.answers.D.imagePreview ? '' : undefined
              } : undefined
            },
            correctAnswer: question.correctAnswer,
            orderNumber: index + 1
          }));

          console.log(processedQuestions)
          quizData = {
            method: 'manual',
            questions: processedQuestions,
            totalQuestions: questions.length,
            hasImages: questions.some(q => 
              q.imagePreview || 
              Object.values(q.answers).some(a => a.imagePreview)
            )
          };
        }
      }

      setUploadProgress(75);

      // Create the content record
      createdContent = await contentOperations.createContent({
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

      // Handle manual quiz questions with image uploads
      if (formData.type === 'quiz' && quizMethod === 'manual' && questions.length > 0) {
        const questionsToCreate = [];
        const updatedQuestions = [...(quizData?.questions || [])];

        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          let questionImageUrl = '';
          const answerImageUrls = { A: '', B: '', C: '', D: '' };

          // Upload question image if exists
          if (question.image) {
            try {
              const uploadResult = await storageOperations.uploadQuizImage(
                question.image,
                createdContent.id,
                'question',
                i.toString()
              );
              questionImageUrl = uploadResult.url;
              // Update the quiz_data with the actual image URL
              if (updatedQuestions[i]) {
                updatedQuestions[i].imageUrl = questionImageUrl;
              }
            } catch (uploadError) {
              console.warn('Failed to upload question image:', uploadError);
            }
          }

          // Upload answer images if they exist
          for (const [answerKey, answerData] of Object.entries(question.answers)) {
            if (answerData.image) {
              try {
                const uploadResult = await storageOperations.uploadQuizImage(
                  answerData.image,
                  createdContent.id,
                  'answer',
                  i.toString(),
                  answerKey
                );
                answerImageUrls[answerKey as keyof typeof answerImageUrls] = uploadResult.url;
                // Update the quiz_data with the actual image URL
                if (updatedQuestions[i] && updatedQuestions[i].answers[answerKey as 'A' | 'B' | 'C' | 'D']) {
                  updatedQuestions[i].answers[answerKey as 'A' | 'B' | 'C' | 'D']!.imageUrl = uploadResult.url;
                }
              } catch (uploadError) {
                console.warn(`Failed to upload answer ${answerKey} image:`, uploadError);
              }
            }
          }

          // Add processed question to the array
          questionsToCreate.push({
            id: question.id,
            text: question.text,
            imageUrl: questionImageUrl || null,
            answers: {
              A: {
                text: question.answers.A.text,
                imageUrl: answerImageUrls.A || null
              },
              B: {
                text: question.answers.B.text,
                imageUrl: answerImageUrls.B || null
              },
              C: {
                text: question.answers.C.text || null,
                imageUrl: answerImageUrls.C || null
              },
              D: {
                text: question.answers.D.text || null,
                imageUrl: answerImageUrls.D || null
              }
            },
            correctAnswer: question.correctAnswer
          });
        }

        // Create all quiz questions
        await contentOperations.createQuizQuestions(createdContent.id, questionsToCreate);

        // Update the content record with the complete quiz_data including image URLs
        const updatedQuizData = {
          ...quizData,
          questions: updatedQuestions
        };

        await contentOperations.updateContent(createdContent.id, {
          quiz_data: updatedQuizData
        });
      }

      

      setUploadProgress(100);

      onContentAdded(createdContent);
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
      text: '',
      answers: { 
        A: { text: '' }, B: { text: '' }, 
        C: { text: '' }, D: { text: '' } 
      },
      correctAnswer: 'A'
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
    if (!currentQuestion.text.trim() || !currentQuestion.answers.A.text.trim() || !currentQuestion.answers.B.text.trim()) {
      setError('Please fill in the question text and at least two answers');
      return;
    }

    const newQuestion: Question = {
      ...currentQuestion,
      id: `q-${Date.now()}`
    };

    setQuestions(prev => [...prev, newQuestion]);
    setCurrentQuestion({
      id: '',
      text: '',
      answers: { 
        A: { text: '' }, B: { text: '' }, 
        C: { text: '' }, D: { text: '' } 
      },
      correctAnswer: 'A'
    });
    setError(null);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentQuestion(prev => ({
          ...prev,
          image: file,
          imagePreview: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeQuestionImage = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      image: undefined,
      imagePreview: undefined
    }));
  };

  const handleAnswerImageChange = (answerKey: 'A' | 'B' | 'C' | 'D', e: React.ChangeEvent<HTMLInputElement>) => {
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

      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentQuestion(prev => ({
          ...prev,
          answers: {
            ...prev.answers,
            [answerKey]: {
              ...prev.answers[answerKey],
              image: file,
              imagePreview: e.target?.result as string
            }
          }
        }));
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeAnswerImage = (answerKey: 'A' | 'B' | 'C' | 'D') => {
    setCurrentQuestion(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [answerKey]: {
          ...prev.answers[answerKey],
          image: undefined,
          imagePreview: undefined
        }
      }
    }));
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm(); // Reset only when closing
      }}>
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
              
              <Tabs value={quizMethod} onValueChange={(value) => setQuizMethod(value as 'ai' | 'upload' | 'manual')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ai">AI Generated</TabsTrigger>
                  <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                  <TabsTrigger value="manual">Manual Creation</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Quiz Generation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="aiPrompt">Describe the quiz you want to create</Label>
                        <Textarea
                          id="aiPrompt"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g., Create a 10-question multiple choice quiz about photosynthesis for O-Level students. Include questions about the process, reactants, products, and importance of photosynthesis."
                          rows={4}
                          disabled={loading}
                        />
                        <p className="text-xs text-gray-500">
                          Be specific about the topic, difficulty level, number of questions, and any particular areas to focus on.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Upload Quiz PDF</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Upload a PDF containing quiz questions and exercises
                        </p>
                        <Input
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf"
                          className="hidden"
                          id="quiz-pdf-file"
                          disabled={loading}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => document.getElementById('quiz-pdf-file')?.click()}
                          disabled={loading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose PDF File
                        </Button>
                        {formData.file && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">
                              Selected: {formData.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Size: {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              className="mt-2"
                              disabled={loading}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Manual Quiz Creation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Existing Questions */}
                      {questions.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Questions ({questions.length})</Label>
                          {questions.map((question, index) => (
                            <Card key={question.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-sm">Question {index + 1}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(question.id)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-sm mb-2">{question.text}</p>
                                {question.imagePreview && (
                                  <img 
                                    src={question.imagePreview} 
                                    alt="Question" 
                                    className="max-w-xs max-h-32 object-contain mb-2 rounded border"
                                  />
                                )}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(question.answers).map(([key, answerData]) => (
                                    <div 
                                      key={key} 
                                      className={`p-2 rounded ${question.correctAnswer === key ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}
                                    >
                                      <strong>{key}:</strong> {answerData.text}
                                      {answerData.imagePreview && (
                                        <img 
                                          src={answerData.imagePreview} 
                                          alt={`Answer ${key}`} 
                                          className="max-w-full max-h-16 object-contain mt-1 rounded border"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Add New Question */}
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-sm">Add New Question</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="questionText">Question Text *</Label>
                            <Textarea
                              id="questionText"
                              value={currentQuestion.text}
                              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                              placeholder="Enter your question here..."
                              rows={2}
                              disabled={loading}
                            />
                          </div>

                          {/* Question Image Upload */}
                          <div className="space-y-2">
                            <Label>Question Image (Optional)</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                              {currentQuestion.imagePreview ? (
                                <div className="space-y-2">
                                  <img 
                                    src={currentQuestion.imagePreview} 
                                    alt="Question preview" 
                                    className="max-w-full max-h-32 object-contain mx-auto rounded border"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={removeQuestionImage}
                                    disabled={loading}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove Image
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <ImageIcon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-600 mb-2">Upload an image for this question</p>
                                  <Input
                                    type="file"
                                    onChange={handleQuestionImageChange}
                                    accept=".jpg,.jpeg,.png,.gif,.webp"
                                    className="hidden"
                                    id="question-image"
                                    disabled={loading}
                                  />
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => document.getElementById('question-image')?.click()}
                                    disabled={loading}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose Image
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Answer Options */}
                          <div className="space-y-3">
                            <Label>Answer Options *</Label>
                            {(['A', 'B', 'C', 'D'] as const).map((option) => (
                              <div key={option} className="space-y-2 p-3 border rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`correct-${option}`}
                                    name="correctAnswer"
                                    checked={currentQuestion.correctAnswer === option}
                                    onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: option }))}
                                    disabled={loading}
                                  />
                                  <Label htmlFor={`correct-${option}`} className="text-sm font-medium min-w-[20px]">
                                    {option}:
                                  </Label>
                                  <Input
                                    value={currentQuestion.answers[option].text}
                                    onChange={(e) => setCurrentQuestion(prev => ({
                                      ...prev,
                                      answers: { 
                                        ...prev.answers, 
                                        [option]: { ...prev.answers[option], text: e.target.value } 
                                      }
                                    }))}
                                    placeholder={`Answer ${option}`}
                                    className="flex-1"
                                    disabled={loading}
                                  />
                                </div>
                                
                                {/* Answer Image Upload */}
                                <div className="ml-6">
                                  <Label className="text-xs text-gray-600">Answer Image (Optional)</Label>
                                  <div className="border border-dashed border-gray-200 rounded p-2 mt-1">
                                    {currentQuestion.answers[option].imagePreview ? (
                                      <div className="space-y-2">
                                        <img 
                                          src={currentQuestion.answers[option].imagePreview} 
                                          alt={`Answer ${option} preview`} 
                                          className="max-w-full max-h-20 object-contain rounded border"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeAnswerImage(option)}
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
                                          onChange={(e) => handleAnswerImageChange(option, e)}
                                          accept=".jpg,.jpeg,.png,.gif,.webp"
                                          className="hidden"
                                          id={`answer-${option}-image`}
                                          disabled={loading}
                                        />
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => document.getElementById(`answer-${option}-image`)?.click()}
                                          disabled={loading}
                                          className="w-full"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Add Image
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-gray-500">Select the radio button next to the correct answer</p>
                          </div>

                          <Button 
                            type="button" 
                            onClick={addQuestion} 
                            className="w-full"
                            disabled={!currentQuestion.text.trim() || !currentQuestion.answers.A.text.trim() || !currentQuestion.answers.B.text.trim() || loading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* File Upload for Non-Quiz Content */
            <div className="space-y-2">
              <Label htmlFor="file">Upload Content File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {getSelectedContentType() && (
                  <div className="mb-4">
                    {React.createElement(getSelectedContentType()!.icon, { 
                      className: "h-12 w-12 mx-auto text-gray-400 mb-2" 
                    })}
                    <p className="text-sm text-gray-600 mb-2">
                      Upload {getSelectedContentType()!.label.toLowerCase()}
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Accepted formats: {getSelectedContentType()!.accept}
                    </p>
                    {formData.type && (
                      <p className="text-xs text-gray-500 mb-4">
                        Max size: {storageOperations.getFileTypeConfig(formData.type).maxSizeMB}MB
                      </p>
                    )}
                  </div>
                )}
                
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept={getSelectedContentType()?.accept || '*'}
                  className="hidden"
                  disabled={loading}
                />
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('file')?.click()}
                  disabled={loading || !formData.type}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                
                {!formData.type && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please select a content type first
                  </p>
                )}
                
                {formData.file && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      Selected: {formData.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="mt-2"
                      disabled={loading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
              disabled={!formData.title || !formData.type || (!formData.chapterId && !isNewChapter) || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Creating...'}
                </>
              ) : (
                'Add Content'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}