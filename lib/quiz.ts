import { supabase } from './supabase';
import { storageOperations } from './storage';

export interface QuizQuestion {
  id: string;
  content_id: string;
  question_text: string;
  question_image_url?: string;
  answer_a: string;
  answer_b: string;
  answer_c?: string;
  answer_d?: string;
  answer_a_image_url?: string;
  answer_b_image_url?: string;
  answer_c_image_url?: string;
  answer_d_image_url?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  order_number: number;
  explanation?: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  content_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken?: number;
  answers: Record<string, string>;
  completed_at: string;
}

export interface QuizData {
  method: 'ai' | 'upload' | 'manual';
  prompt?: string;
  fileUrl?: string;
  generated?: boolean;
  totalQuestions: number;
  totalPoints: number;
  hasImages: boolean;
  timeLimit?: number;
  passingScore?: number;
  allowRetakes?: boolean;
  showCorrectAnswers?: boolean;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
}

export const quizOperations = {
  // Create a quiz question
  async createQuestion(questionData: Omit<QuizQuestion, 'id' | 'created_at' | 'updated_at'>): Promise<QuizQuestion> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating quiz question:', error);
        throw new Error(`Failed to create quiz question: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in createQuestion:', error);
      throw error;
    }
  },

  // Get all questions for a quiz
  async getQuestions(contentId: string): Promise<QuizQuestion[]> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('content_id', contentId)
        .order('order_number', { ascending: true });

      if (error) {
        console.error('Error fetching quiz questions:', error);
        throw new Error(`Failed to fetch quiz questions: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getQuestions:', error);
      throw error;
    }
  },

  // Update a quiz question
  async updateQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quiz question:', error);
        throw new Error(`Failed to update quiz question: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in updateQuestion:', error);
      throw error;
    }
  },

  // Delete a quiz question
  async deleteQuestion(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quiz question:', error);
        throw new Error(`Failed to delete quiz question: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in deleteQuestion:', error);
      throw error;
    }
  },

  // Upload quiz image
  async uploadQuizImage(file: File, questionId: string, imageType: 'question' | 'answer_a' | 'answer_b' | 'answer_c' | 'answer_d'): Promise<string> {
    try {
      // Validate file
      const validation = storageOperations.validateFile(file, ['jpg', 'jpeg', 'png', 'gif', 'webp'], 5);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${questionId}-${imageType}-${Date.now()}.${fileExt}`;
      const filePath = `quiz-images/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('quiz-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('quiz-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error in uploadQuizImage:', error);
      throw error;
    }
  },

  // Delete quiz image
  async deleteQuizImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-1)[0]; // Get filename

      const { error } = await supabase.storage
        .from('quiz-images')
        .remove([`quiz-images/${filePath}`]);

      if (error) {
        console.warn('Failed to delete quiz image:', error);
        // Don't throw error as this is not critical
      }
    } catch (error) {
      console.warn('Error deleting quiz image:', error);
    }
  },

  // Submit quiz attempt
  async submitAttempt(attemptData: Omit<QuizAttempt, 'id' | 'completed_at'>): Promise<QuizAttempt> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert(attemptData)
        .select()
        .single();

      if (error) {
        console.error('Error submitting quiz attempt:', error);
        throw new Error(`Failed to submit quiz attempt: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in submitAttempt:', error);
      throw error;
    }
  },

  // Get user's quiz attempts
  async getUserAttempts(contentId: string, userId: string): Promise<QuizAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('content_id', contentId)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching quiz attempts:', error);
        throw new Error(`Failed to fetch quiz attempts: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserAttempts:', error);
      throw error;
    }
  },

  // Get quiz statistics
  async getQuizStatistics(contentId: string): Promise<{
    total_questions: number;
    has_images: boolean;
    total_points: number;
    avg_completion_time: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_quiz_statistics', { content_id_param: contentId });

      if (error) {
        console.error('Error fetching quiz statistics:', error);
        throw new Error(`Failed to fetch quiz statistics: ${error.message}`);
      }

      return data[0] || {
        total_questions: 0,
        has_images: false,
        total_points: 0,
        avg_completion_time: 0
      };
    } catch (error: any) {
      console.error('Error in getQuizStatistics:', error);
      throw error;
    }
  },

  // Get quiz leaderboard
  async getQuizLeaderboard(contentId: string, limit: number = 10): Promise<{
    user_name: string;
    score: number;
    percentage: number;
    completed_at: string;
  }[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_quiz_leaderboard', { 
          content_id_param: contentId,
          limit_param: limit 
        });

      if (error) {
        console.error('Error fetching quiz leaderboard:', error);
        throw new Error(`Failed to fetch quiz leaderboard: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getQuizLeaderboard:', error);
      throw error;
    }
  },

  // Bulk create questions from JSON
  async createQuestionsFromData(contentId: string, questionsData: any[]): Promise<QuizQuestion[]> {
    try {
      const questions = questionsData.map((q, index) => ({
        content_id: contentId,
        question_text: q.text || q.question,
        answer_a: q.answers?.A || q.options?.[0] || '',
        answer_b: q.answers?.B || q.options?.[1] || '',
        answer_c: q.answers?.C || q.options?.[2] || null,
        answer_d: q.answers?.D || q.options?.[3] || null,
        correct_answer: q.correctAnswer || q.correct || 'A',
        order_number: index + 1,
        explanation: q.explanation || null,
        points: q.points || 1
      }));

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questions)
        .select();

      if (error) {
        console.error('Error creating questions from data:', error);
        throw new Error(`Failed to create questions: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in createQuestionsFromData:', error);
      throw error;
    }
  }
};