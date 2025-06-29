import { supabase } from './supabase';
import type { Subject, Content } from './supabase';

// Subject operations
export const subjectOperations = {
  // Create a new subject
  async createSubject(subjectData: {
    name: string;
    description?: string;
    level: 'JC' | 'O-Level' | 'A-Level';
    exam_board: 'ZIMSEC' | 'Cambridge';
    school_id?: string;
    teachers?: Array<{
      name: string;
      email: string;
      phone?: string;
      qualification?: string;
    }>;
  }) {
    try {
      // Insert the subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          name: subjectData.name,
          description: subjectData.description,
          level: subjectData.level,
          exam_board: subjectData.exam_board,
          school_id: subjectData.school_id,
          is_active: true,
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // Create default terms structure
      const terms = [
        { title: 'Term 1', order_number: 1 },
        { title: 'Term 2', order_number: 2 },
        { title: 'Term 3', order_number: 3 },
      ];

      for (const term of terms) {
        const { data: termData, error: termError } = await supabase
          .from('terms')
          .insert({
            subject_id: subject.id,
            title: term.title,
            order_number: term.order_number,
          })
          .select()
          .single();

        if (termError) throw termError;

        // Create 13 weeks for each term
        const weeks = Array.from({ length: 13 }, (_, i) => ({
          term_id: termData.id,
          title: `Week ${i + 1}`,
          order_number: i + 1,
        }));

        const { error: weeksError } = await supabase
          .from('weeks')
          .insert(weeks);

        if (weeksError) throw weeksError;
      }

      // Add teachers if provided
      if (subjectData.teachers && subjectData.teachers.length > 0) {
        const teachersToInsert = subjectData.teachers.map(teacher => ({
          subject_id: subject.id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          qualification: teacher.qualification,
        }));

        const { error: teachersError } = await supabase
          .from('subject_teachers')
          .insert(teachersToInsert);

        if (teachersError) throw teachersError;
      }

      return subject;
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  },

  // Get all subjects with their structure
  async getSubjects() {
    try {
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select(`
          *,
          terms (
            *,
            weeks (
              *,
              chapters (
                *,
                content (*)
              )
            )
          ),
          subject_teachers (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return subjects;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },

  // Get subject by ID
  async getSubjectById(id: string) {
    try {
      const { data: subject, error } = await supabase
        .from('subjects')
        .select(`
          *,
          terms (
            *,
            weeks (
              *,
              chapters (
                *,
                content (*)
              )
            )
          ),
          subject_teachers (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return subject;
    } catch (error) {
      console.error('Error fetching subject:', error);
      throw error;
    }
  },

  // Update subject
  async updateSubject(id: string, updates: Partial<Subject>) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  },

  // Delete subject
  async deleteSubject(id: string) {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  },
};

// Content operations
export const contentOperations = {
  // Create a new chapter
  async createChapter(chapterData: {
    week_id: string;
    title: string;
    description?: string;
    order_number: number;
    is_continuation?: boolean;
    original_chapter_id?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert(chapterData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating chapter:', error);
      throw error;
    }
  },

  // Create new content/topic
  async createContent(contentData: {
    chapter_id: string;
    title: string;
    type: 'video' | 'pdf' | 'quiz' | 'notes';
    description?: string;
    file_url?: string;
    file_size?: number;
    duration?: string;
    estimated_study_time?: string;
    order_number: number;
    tags?: string[];
    created_by?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('content')
        .insert({
          ...contentData,
          status: 'published',
          view_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  },

  // Get content by chapter
  async getContentByChapter(chapterId: string) {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  },

  // Update content
  async updateContent(id: string, updates: Partial<Content>) {
    try {
      const { data, error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  },

  // Delete content
  async deleteContent(id: string) {
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  },

  // Get weeks by term
  async getWeeksByTerm(termId: string) {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select(`
          *,
          chapters (
            *,
            content (*)
          )
        `)
        .eq('term_id', termId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching weeks:', error);
      throw error;
    }
  },

  // Get chapters by week
  async getChaptersByWeek(weekId: string) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          content (*)
        `)
        .eq('week_id', weekId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching chapters:', error);
      throw error;
    }
  },
};

// School operations
export const schoolOperations = {
  // Get all schools
  async getSchools() {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching schools:', error);
      throw error;
    }
  },

  // Create school
  async createSchool(schoolData: {
    name: string;
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    principal_name?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .insert({
          ...schoolData,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating school:', error);
      throw error;
    }
  },
};