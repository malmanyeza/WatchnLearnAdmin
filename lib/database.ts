import { supabase } from './supabase';

// Enhanced Subject operations
export const subjectOperations = {
  // Create a new subject with proper structure
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
      console.log('Creating subject with data:', subjectData);

      // Insert the subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          name: subjectData.name,
          description: subjectData.description,
          level: subjectData.level,
          exam_board: subjectData.exam_board,
          school_id: subjectData.school_id || null,
          is_active: true,
          enrolled_students: 0,
          content_items: 0,
          completion_rate: 0.0,
        })
        .select()
        .single();

      if (subjectError) {
        console.error('Subject creation error:', subjectError);
        throw new Error(`Failed to create subject: ${subjectError.message}`);
      }

      console.log('Subject created:', subject);

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

        if (termError) {
          console.error('Term creation error:', termError);
          throw new Error(`Failed to create term: ${termError.message}`);
        }

        console.log('Term created:', termData);

        // Create 13 weeks for each term
        const weeks = Array.from({ length: 13 }, (_, i) => ({
          term_id: termData.id,
          title: `Week ${i + 1}`,
          order_number: i + 1,
        }));

        const { error: weeksError } = await supabase
          .from('weeks')
          .insert(weeks);

        if (weeksError) {
          console.error('Weeks creation error:', weeksError);
          throw new Error(`Failed to create weeks: ${weeksError.message}`);
        }

        console.log(`Created 13 weeks for ${term.title}`);
      }

      // Add teachers if provided
      if (subjectData.teachers && subjectData.teachers.length > 0) {
        const teachersToInsert = subjectData.teachers.map(teacher => ({
          subject_id: subject.id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone || null,
          qualification: teacher.qualification || null,
        }));

        const { error: teachersError } = await supabase
          .from('subject_teachers')
          .insert(teachersToInsert);

        if (teachersError) {
          console.error('Teachers creation error:', teachersError);
          throw new Error(`Failed to add teachers: ${teachersError.message}`);
        }

        console.log('Teachers added:', teachersToInsert.length);
      }

      // Return the complete subject with its structure
      return await this.getSubjectById(subject.id);
    } catch (error: any) {
      console.error('Error in createSubject:', error);
      throw error;
    }
  },

  // Get all subjects with their complete structure and statistics
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

      if (error) {
        console.error('Error fetching subjects:', error);
        throw new Error(`Failed to fetch subjects: ${error.message}`);
      }

      console.log('Fetched subjects:', subjects?.length || 0);
      return subjects || [];
    } catch (error: any) {
      console.error('Error in getSubjects:', error);
      throw error;
    }
  },

  // Get subject by ID with complete structure
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
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching subject by ID:', error);
        throw new Error(`Failed to fetch subject: ${error.message}`);
      }

      return subject;
    } catch (error: any) {
      console.error('Error in getSubjectById:', error);
      throw error;
    }
  },

  // Update subject
  async updateSubject(id: string, updates: {
    name?: string;
    description?: string;
    level?: 'JC' | 'O-Level' | 'A-Level';
    exam_board?: 'ZIMSEC' | 'Cambridge';
    school_id?: string;
    is_active?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating subject:', error);
        throw new Error(`Failed to update subject: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in updateSubject:', error);
      throw error;
    }
  },

  // Soft delete subject
  async deleteSubject(id: string) {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting subject:', error);
        throw new Error(`Failed to delete subject: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in deleteSubject:', error);
      throw error;
    }
  },

  // Update subject statistics manually
  async updateSubjectStatistics(id: string) {
    try {
      const { error } = await supabase.rpc('update_subject_statistics', {
        subject_id_param: id
      });

      if (error) {
        console.error('Error updating subject statistics:', error);
        throw new Error(`Failed to update statistics: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in updateSubjectStatistics:', error);
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

      if (error) {
        console.error('Error creating chapter:', error);
        throw new Error(`Failed to create chapter: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in createChapter:', error);
      throw error;
    }
  },

  // Create new content/topic with file support
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
    quiz_data?: any;
    created_by?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('content')
        .insert({
          ...contentData,
          status: 'published',
          view_count: 0,
          tags: contentData.tags || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating content:', error);
        throw new Error(`Failed to create content: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in createContent:', error);
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

      if (error) {
        console.error('Error fetching content:', error);
        throw new Error(`Failed to fetch content: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getContentByChapter:', error);
      throw error;
    }
  },

  // Update content
  async updateContent(id: string, updates: {
    title?: string;
    type?: 'video' | 'pdf' | 'quiz' | 'notes';
    description?: string;
    file_url?: string;
    file_size?: number;
    duration?: string;
    estimated_study_time?: string;
    order_number?: number;
    status?: 'draft' | 'published' | 'review' | 'archived';
    tags?: string[];
  }) {
    try {
      const { data, error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content:', error);
        throw new Error(`Failed to update content: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in updateContent:', error);
      throw error;
    }
  },

  // Delete content
  async deleteContent(id: string) {
    try {
      // First get the content to check if it has a file
      const { data: content, error: fetchError } = await supabase
        .from('content')
        .select('file_url')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching content for deletion:', fetchError);
        throw new Error(`Failed to fetch content: ${fetchError.message}`);
      }

      // Delete the content record
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting content:', error);
        throw new Error(`Failed to delete content: ${error.message}`);
      }

      // If content had a file, delete it from storage
      if (content?.file_url) {
        try {
          // Extract file path from URL for storage deletion
          const url = new URL(content.file_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // Get last two parts (folder/filename)
          
          const { error: storageError } = await supabase.storage
            .from('content-files')
            .remove([filePath]);

          if (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
            // Don't throw error here as the content record is already deleted
          }
        } catch (storageError) {
          console.warn('Error deleting file from storage:', storageError);
        }
      }
    } catch (error: any) {
      console.error('Error in deleteContent:', error);
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

      if (error) {
        console.error('Error fetching weeks:', error);
        throw new Error(`Failed to fetch weeks: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getWeeksByTerm:', error);
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

      if (error) {
        console.error('Error fetching chapters:', error);
        throw new Error(`Failed to fetch chapters: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getChaptersByWeek:', error);
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

      if (error) {
        console.error('Error fetching schools:', error);
        throw new Error(`Failed to fetch schools: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getSchools:', error);
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

      if (error) {
        console.error('Error creating school:', error);
        throw new Error(`Failed to create school: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in createSchool:', error);
      throw error;
    }
  },

  // Update school
  async updateSchool(id: string, updates: {
    name?: string;
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    principal_name?: string;
    is_active?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating school:', error);
        throw new Error(`Failed to update school: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in updateSchool:', error);
      throw error;
    }
  },

  // Delete school (soft delete)
  async deleteSchool(id: string) {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting school:', error);
        throw new Error(`Failed to delete school: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in deleteSchool:', error);
      throw error;
    }
  },
};

// User enrollment operations
export const enrollmentOperations = {
  // Enroll user in subject
  async enrollUser(userId: string, subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .insert({
          user_id: userId,
          subject_id: subjectId,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error enrolling user:', error);
        throw new Error(`Failed to enroll user: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in enrollUser:', error);
      throw error;
    }
  },

  // Get user enrollments
  async getUserEnrollments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select(`
          *,
          subjects (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user enrollments:', error);
        throw new Error(`Failed to fetch enrollments: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getUserEnrollments:', error);
      throw error;
    }
  },

  // Get subject enrollments
  async getSubjectEnrollments(subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('user_enrollments')
        .select(`
          *,
          profiles (*)
        `)
        .eq('subject_id', subjectId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching subject enrollments:', error);
        throw new Error(`Failed to fetch enrollments: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getSubjectEnrollments:', error);
      throw error;
    }
  },
};