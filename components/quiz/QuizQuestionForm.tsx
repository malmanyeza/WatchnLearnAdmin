'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { quizOperations, QuizQuestion } from '@/lib/quiz';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuizQuestionFormProps {
  contentId: string;
  question?: QuizQuestion;
  orderNumber: number;
  onSave: (question: QuizQuestion) => void;
  onCancel: () => void;
  onDelete?: (questionId: string) => void;
}

export function QuizQuestionForm({ 
  contentId, 
  question, 
  orderNumber, 
  onSave, 
  onCancel, 
  onDelete 
}: QuizQuestionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    answer_a: question?.answer_a || '',
    answer_b: question?.answer_b || '',
    answer_c: question?.answer_c || '',
    answer_d: question?.answer_d || '',
    correct_answer: question?.correct_answer || 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: question?.explanation || '',
    points: question?.points || 1,
  });

  const [images, setImages] = useState({
    question: question?.question_image_url || '',
    answer_a: question?.answer_a_image_url || '',
    answer_b: question?.answer_b_image_url || '',
    answer_c: question?.answer_c_image_url || '',
    answer_d: question?.answer_d_image_url || '',
  });

  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  const handleImageUpload = async (file: File, imageType: keyof typeof images) => {
    if (!file) return;

    setUploadingImages(prev => new Set(prev).add(imageType));
    setError(null);

    try {
      const questionId = question?.id || `temp-${Date.now()}`;
      const imageUrl = await quizOperations.uploadQuizImage(file, questionId, imageType);
      
      setImages(prev => ({
        ...prev,
        [imageType]: imageUrl
      }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError(error.message || 'Failed to upload image');
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageType);
        return newSet;
      });
    }
  };

  const handleImageRemove = async (imageType: keyof typeof images) => {
    const imageUrl = images[imageType];
    if (imageUrl) {
      try {
        await quizOperations.deleteQuizImage(imageUrl);
      } catch (error) {
        console.warn('Failed to delete image from storage:', error);
      }
    }
    
    setImages(prev => ({
      ...prev,
      [imageType]: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const questionData = {
        content_id: contentId,
        question_text: formData.question_text,
        question_image_url: images.question || undefined,
        answer_a: formData.answer_a,
        answer_b: formData.answer_b,
        answer_c: formData.answer_c || undefined,
        answer_d: formData.answer_d || undefined,
        answer_a_image_url: images.answer_a || undefined,
        answer_b_image_url: images.answer_b || undefined,
        answer_c_image_url: images.answer_c || undefined,
        answer_d_image_url: images.answer_d || undefined,
        correct_answer: formData.correct_answer,
        order_number: orderNumber,
        explanation: formData.explanation || undefined,
        points: formData.points,
      };

      let savedQuestion: QuizQuestion;
      
      if (question?.id) {
        // Update existing question
        savedQuestion = await quizOperations.updateQuestion(question.id, questionData);
      } else {
        // Create new question
        savedQuestion = await quizOperations.createQuestion(questionData);
      }

      onSave(savedQuestion);
    } catch (error: any) {
      console.error('Error saving question:', error);
      setError(error.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!question?.id || !onDelete) return;
    
    if (!confirm('Are you sure you want to delete this question?')) return;

    setLoading(true);
    try {
      await quizOperations.deleteQuestion(question.id);
      onDelete(question.id);
    } catch (error: any) {
      console.error('Error deleting question:', error);
      setError(error.message || 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  const renderImageUpload = (imageType: keyof typeof images, label: string) => {
    const isUploading = uploadingImages.has(imageType);
    const hasImage = !!images[imageType];

    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
          {hasImage ? (
            <div className="space-y-2">
              <img 
                src={images[imageType]} 
                alt={label}
                className="max-w-full max-h-32 object-contain mx-auto rounded border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleImageRemove(imageType)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-600 mb-2">Upload image (optional)</p>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, imageType);
                }}
                accept=".jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                id={`${imageType}-image`}
                disabled={loading || isUploading}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById(`${imageType}-image`)?.click()}
                disabled={loading || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {question ? 'Edit Question' : `Question ${orderNumber}`}
          </CardTitle>
          {question && onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
              placeholder="Enter your question here..."
              rows={3}
              required
              disabled={loading}
            />
          </div>

          {/* Question Image */}
          {renderImageUpload('question', 'Question Image')}

          {/* Answer Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Answer Options *</Label>
            
            {(['A', 'B', 'C', 'D'] as const).map((option) => (
              <div key={option} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`correct-${option}`}
                    name="correctAnswer"
                    checked={formData.correct_answer === option}
                    onChange={() => setFormData(prev => ({ ...prev, correct_answer: option }))}
                    disabled={loading}
                  />
                  <Label htmlFor={`correct-${option}`} className="text-sm font-medium">
                    Option {option} {formData.correct_answer === option && <Badge variant="secondary" className="ml-2">Correct</Badge>}
                  </Label>
                </div>
                
                <Input
                  value={formData[`answer_${option.toLowerCase()}` as keyof typeof formData] as string}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [`answer_${option.toLowerCase()}`]: e.target.value
                  }))}
                  placeholder={`Answer ${option}`}
                  required={option === 'A' || option === 'B'}
                  disabled={loading}
                />

                {renderImageUpload(`answer_${option.toLowerCase()}` as keyof typeof images, `Answer ${option} Image`)}
              </div>
            ))}
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={formData.points}
                onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                disabled={loading}
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Explain why this is the correct answer..."
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!formData.question_text || !formData.answer_a || !formData.answer_b || loading}
            >
              {loading ? 'Saving...' : question ? 'Update Question' : 'Add Question'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}