'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  X, 
  Plus, 
  FileText, 
  Video, 
  HelpCircle, 
  BookOpen, 
  Loader2, 
  Image as ImageIcon,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { contentOperations, subjectOperations } from '@/lib/database';
import { storageOperations } from '@/lib/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Question {
  id: string;
  text: string;
  image?: File;
  imagePreview?: string;
  answers: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

interface AddContentDialogProps {
  trigger: React.ReactNode;
  onContentAdded: (content: any) => void;
  subjects: any[];
}

const contentTypes = [
  { value: 'video', label: 'Video', icon: Video, accept: '.mp4,.mov,.avi,.mkv,.webm' },
  { value: 'pdf', label: 'PDF Document', icon: FileText, accept: '.pdf' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, accept: '.json,.txt,.pdf' },
  { value: 'notes', label: 'Notes', icon: BookOpen, accept: '.pdf,.doc,.docx,.txt' },
];

export function AddContentDialog({ trigger, onContentAdded, subjects }: AddContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video',
    duration: '',
    estimatedTime: '',
    tags: [] as string[],
    file: null as File | null,
    subjectId: '',
    termId: '',
    weekId: '',
    chapterId: '',
  });
  const [currentTag, setCurrentTag] = useState('');

  // Quiz-specific state
  const [quizMethod, setQuizMethod] = useState<'ai' | 'upload' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    text: '',
    answers: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let fileUrl = '';
      let fileSize = 0;
      let quizData = null;

      // Handle file upload if file is provided
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
            questions: questions.map(q => ({
              id: q.id,
              text: q.text,
              image: q.imagePreview || null,
              answers: q.answers,
              correctAnswer: q.correctAnswer
            }))
          };
        }
      }

      setUploadProgress(100);

      const newContentData = {
        chapter_id: formData.chapterId,
        title: formData.title,
        type: formData.type as 'video' | 'pdf' | 'quiz' | 'notes',
        description: formData.description,
        file_url: fileUrl || undefined,
        file_size: fileSize || undefined,
        duration: formData.duration || undefined,
        estimated_study_time: formData.estimatedTime || undefined,
        order_number: 1, // Will be calculated properly in the backend
        tags: formData.tags,
        quiz_data: quizData
      };

      const newContent = await contentOperations.createContent(newContentData);
      onContentAdded(newContent);
      resetForm();
      setOpen(false);
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
      title: '',
      description: '',
      type: 'video',
      duration: '',
      estimatedTime: '',
      tags: [],
      file: null,
      subjectId: '',
      termId: '',
      weekId: '',
      chapterId: '',
    });
    setCurrentTag('');
    setQuizMethod('ai');
    setAiPrompt('');
    setQuestions([]);
    setCurrentQuestion({
      id: '',
      text: '',
      answers: { A: '', B: '', C: '', D: '' },
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
    if (!currentQuestion.text.trim() || !currentQuestion.answers.A.trim() || !currentQuestion.answers.B.trim()) {
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
      answers: { A: '', B: '', C: '', D: '' },
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
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter content title..."
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
                <SelectValue />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration/Length</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 15 minutes, 24 pages"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">Estimated Study Time</Label>
              <Input
                id="estimatedTime"
                value={formData.estimatedTime}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                placeholder="e.g., 30 minutes"
                disabled={loading}
              />
            </div>
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
                          placeholder="e.g., Create a 10-question multiple choice quiz about photosynthesis for O-Level students..."
                          rows={4}
                          disabled={loading}
                        />
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
                          Upload a PDF containing quiz questions
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
                                  {Object.entries(question.answers).map(([key, value]) => (
                                    <div 
                                      key={key} 
                                      className={`p-2 rounded ${question.correctAnswer === key ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}
                                    >
                                      <strong>{key}:</strong> {value}
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
                              <div key={option} className="flex items-center space-x-2">
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
                                  value={currentQuestion.answers[option]}
                                  onChange={(e) => setCurrentQuestion(prev => ({
                                    ...prev,
                                    answers: { ...prev.answers, [option]: e.target.value }
                                  }))}
                                  placeholder={`Answer ${option}`}
                                  className="flex-1"
                                  disabled={loading}
                                />
                              </div>
                            ))}
                            <p className="text-xs text-gray-500">Select the radio button next to the correct answer</p>
                          </div>

                          <Button 
                            type="button" 
                            onClick={addQuestion} 
                            className="w-full"
                            disabled={!currentQuestion.text.trim() || !currentQuestion.answers.A.trim() || !currentQuestion.answers.B.trim() || loading}
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

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={!formData.title.trim() || loading}
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