import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export const storageOperations = {
  // Upload content files (videos, PDFs, etc.)
  async uploadContentFile(file: File, contentId: string, contentType: string): Promise<UploadResult> {
    try {
      // Generate a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${contentId}-${Date.now()}.${fileExt}`;
      const filePath = `content/${contentType}/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, size: file.size });

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('content-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      console.log('File uploaded successfully:', data);

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('content-files')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size
      };
    } catch (error: any) {
      console.error('Error in uploadContentFile:', error);
      throw error;
    }
  },

  // Upload textbook covers
  async uploadTextbookCover(file: File, textbookId: string): Promise<UploadResult> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${textbookId}-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { data, error } = await supabase.storage
        .from('textbook-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Failed to upload cover: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('textbook-covers')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size
      };
    } catch (error: any) {
      console.error('Error in uploadTextbookCover:', error);
      throw error;
    }
  },

  // Upload past papers
  async uploadPastPaper(file: File, paperId: string, fileType: 'question' | 'marking_scheme'): Promise<UploadResult> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${paperId}-${fileType}-${Date.now()}.${fileExt}`;
      const filePath = `papers/${fileName}`;

      const bucketName = fileType === 'marking_scheme' ? 'marking-schemes' : 'past-papers';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Failed to upload ${fileType}: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size
      };
    } catch (error: any) {
      console.error('Error in uploadPastPaper:', error);
      throw error;
    }
  },

  // Upload syllabus files
  async uploadSyllabusFile(file: File, syllabusId: string, fileType: 'syllabus' | 'assessment' | 'specimen'): Promise<UploadResult> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${syllabusId}-${fileType}-${Date.now()}.${fileExt}`;
      const filePath = `syllabus/${fileName}`;

      const { data, error } = await supabase.storage
        .from('syllabus-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Failed to upload ${fileType}: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('syllabus-files')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size
      };
    } catch (error: any) {
      console.error('Error in uploadSyllabusFile:', error);
      throw error;
    }
  },

  // Upload user avatars
  async uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Failed to upload avatar: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size
      };
    } catch (error: any) {
      console.error('Error in uploadUserAvatar:', error);
      throw error;
    }
  },

  // Delete file from storage
  async deleteFile(bucket: string, filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in deleteFile:', error);
      throw error;
    }
  },

  // Get file download URL (for private files)
  async getDownloadUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to get download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('Error in getDownloadUrl:', error);
      throw error;
    }
  },

  // Validate file type and size
  validateFile(file: File, allowedTypes: string[], maxSizeMB: number = 100): { valid: boolean; error?: string } {
    // Check file type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size too large. Maximum size: ${maxSizeMB}MB`
      };
    }

    return { valid: true };
  },

  // Get file type configuration
  getFileTypeConfig(contentType: string) {
    const configs = {
      video: {
        allowedTypes: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
        maxSizeMB: 500,
        accept: '.mp4,.mov,.avi,.mkv,.webm'
      },
      pdf: {
        allowedTypes: ['pdf'],
        maxSizeMB: 50,
        accept: '.pdf'
      },
      quiz: {
        allowedTypes: ['json', 'txt'],
        maxSizeMB: 5,
        accept: '.json,.txt'
      },
      notes: {
        allowedTypes: ['pdf', 'doc', 'docx', 'txt'],
        maxSizeMB: 25,
        accept: '.pdf,.doc,.docx,.txt'
      }
    };

    return configs[contentType as keyof typeof configs] || configs.pdf;
  }
};