'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Video,
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Copy,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { contentOperations } from '@/lib/database';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Topic {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz' | 'notes';
  duration?: string;
  order_number: number;
  status: 'published' | 'draft' | 'review';
  estimated_study_time?: string;
}

interface Chapter {
  id: string;
  title: string;
  description?: string;
  order_number: number;
  content: Topic[];
  isExpanded?: boolean;
  is_continuation?: boolean;
  original_chapter_id?: string;
}

interface Week {
  id: string;
  title: string;
  order_number: number;
  chapters: Chapter[];
  isExpanded?: boolean;
}

interface Term {
  id: string;
  title: string;
  order_number: number;
  weeks: Week[];
  isExpanded?: boolean;
}

interface Subject {
  id: string;
  name: string;
  level: string;
  exam_board: string;
  school?: string;
  terms: Term[];
  isExpanded?: boolean;
}

interface ContentHierarchyProps {
  subjects: Subject[];
  onDataChange: () => void;
}

const typeIcons = {
  video: Video,
  pdf: FileText,
  quiz: HelpCircle,
  notes: BookOpen,
};

const statusColors = {
  published: 'bg-success/10 text-success',
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-warning/10 text-warning',
};

const levels = ['JC', 'O-Level', 'A-Level'];
const examBoards = ['ZIMSEC', 'Cambridge'];
const topicTypes = ['video', 'pdf', 'quiz', 'notes'];

export function ContentHierarchy({ subjects: initialSubjects, onDataChange }: ContentHierarchyProps) {
  const [subjects, setSubjects] = useState<Subject[]>(
    initialSubjects.map(subject => ({ ...subject, isExpanded: true }))
  );
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editExamBoard, setEditExamBoard] = useState('');
  const [editTopicType, setEditTopicType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'week' | 'chapter' | 'topic'>('week');
  const [addDialogContext, setAddDialogContext] = useState<{
    subjectId: string;
    termId?: string;
    weekId?: string;
    chapterId?: string;
  }>({ subjectId: '' });
  const [addFormData, setAddFormData] = useState({
    title: '',
    description: '',
    type: 'video',
    duration: '',
    estimatedTime: '',
  });

  // Update subjects when props change
  useState(() => {
    setSubjects(initialSubjects.map(subject => ({ ...subject, isExpanded: true })));
  }, [initialSubjects]);

  const toggleExpanded = (type: string, id: string, parentIds?: string[]) => {
    setSubjects(prev => prev.map(subject => {
      if (type === 'subject' && subject.id === id) {
        return { ...subject, isExpanded: !subject.isExpanded };
      }
      
      if (parentIds && parentIds[0] === subject.id) {
        return {
          ...subject,
          terms: subject.terms.map(term => {
            if (type === 'term' && term.id === id) {
              return { ...term, isExpanded: !term.isExpanded };
            }
            
            if (parentIds[1] === term.id) {
              return {
                ...term,
                weeks: term.weeks.map(week => {
                  if (type === 'week' && week.id === id) {
                    return { ...week, isExpanded: !week.isExpanded };
                  }
                  
                  if (parentIds[2] === week.id) {
                    return {
                      ...week,
                      chapters: week.chapters.map(chapter => {
                        if (type === 'chapter' && chapter.id === id) {
                          return { ...chapter, isExpanded: !chapter.isExpanded };
                        }
                        return chapter;
                      }),
                    };
                  }
                  return week;
                }),
              };
            }
            return term;
          }),
        };
      }
      return subject;
    }));
  };

  const openAddDialog = (type: 'week' | 'chapter' | 'topic', context: any) => {
    setAddDialogType(type);
    setAddDialogContext(context);
    setAddFormData({
      title: '',
      description: '',
      type: 'video',
      duration: '',
      estimatedTime: '',
    });
    setAddDialogOpen(true);
  };

  const handleAddItem = async () => {
    setLoading(true);
    setError(null);

    try {
      const { subjectId, termId, weekId, chapterId } = addDialogContext;

      if (addDialogType === 'chapter' && weekId) {
        // Create new chapter
        const newChapter = await contentOperations.createChapter({
          week_id: weekId,
          title: addFormData.title,
          description: addFormData.description,
          order_number: 1, // Will be calculated properly in the backend
        });
        console.log('Chapter created:', newChapter);
      } else if (addDialogType === 'topic' && chapterId) {
        // Create new content/topic
        const newContent = await contentOperations.createContent({
          chapter_id: chapterId,
          title: addFormData.title,
          type: addFormData.type as 'video' | 'pdf' | 'quiz' | 'notes',
          duration: addFormData.duration || undefined,
          estimated_study_time: addFormData.estimatedTime || undefined,
          order_number: 1, // Will be calculated properly in the backend
        });
        console.log('Content created:', newContent);
      }

      // Refresh data from parent
      onDataChange();
      setAddDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding item:', error);
      setError(error.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const continueChapterToNextWeek = async (subjectId: string, termId: string, weekId: string, chapterId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Find the current week and next week
      const subject = subjects.find(s => s.id === subjectId);
      const term = subject?.terms.find(t => t.id === termId);
      const currentWeekIndex = term?.weeks.findIndex(w => w.id === weekId) || -1;
      const nextWeek = term?.weeks[currentWeekIndex + 1];
      
      if (nextWeek) {
        const originalChapter = term?.weeks[currentWeekIndex].chapters.find(c => c.id === chapterId);
        
        if (originalChapter) {
          // Create continuation chapter in next week
          await contentOperations.createChapter({
            week_id: nextWeek.id,
            title: originalChapter.title,
            description: originalChapter.description,
            order_number: nextWeek.chapters.length + 1,
            is_continuation: true,
            original_chapter_id: originalChapter.id,
          });

          // Refresh data
          onDataChange();
        }
      }
    } catch (error: any) {
      console.error('Error continuing chapter:', error);
      setError(error.message || 'Failed to continue chapter');
    } finally {
      setLoading(false);
    }
  };

  const moveTopicUp = async (subjectId: string, termId: string, weekId: string, chapterId: string, topicId: string) => {
    // This would require a backend function to reorder content
    console.log('Move topic up:', topicId);
  };

  const moveTopicDown = async (subjectId: string, termId: string, weekId: string, chapterId: string, topicId: string) => {
    // This would require a backend function to reorder content
    console.log('Move topic down:', topicId);
  };

  const startEditing = (id: string, currentValue: string, level?: string, examBoard?: string, topicType?: string) => {
    setEditingItem(id);
    setEditValue(currentValue);
    setEditLevel(level || '');
    setEditExamBoard(examBoard || '');
    setEditTopicType(topicType || '');
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    setLoading(true);
    setError(null);

    try {
      // Parse the editing item ID to determine what we're editing
      const [type, id] = editingItem.split('-');

      if (type === 'content') {
        await contentOperations.updateContent(id, {
          title: editValue,
          type: editTopicType as 'video' | 'pdf' | 'quiz' | 'notes',
        });
      }
      // Add other update operations for chapters, weeks, terms, subjects

      // Refresh data
      onDataChange();
      cancelEdit();
    } catch (error: any) {
      console.error('Error saving edit:', error);
      setError(error.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
    setEditLevel('');
    setEditExamBoard('');
    setEditTopicType('');
  };

  const deleteItem = async (type: string, id: string, parentIds?: string[]) => {
    setLoading(true);
    setError(null);

    try {
      if (type === 'content') {
        await contentOperations.deleteContent(id);
      }
      // Add other delete operations

      // Refresh data
      onDataChange();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      setError(error.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const renderTopic = (
    topic: Topic, 
    subjectId: string, 
    termId: string, 
    weekId: string, 
    chapterId: string,
    topicIndex: number,
    totalTopics: number
  ) => {
    const TypeIcon = typeIcons[topic.type];
    const isEditing = editingItem === `content-${topic.id}`;
    
    return (
      <div
        key={topic.id}
        className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 group"
      >
        <div className="flex items-center space-x-3">
          <div className="flex flex-col space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => moveTopicUp(subjectId, termId, weekId, chapterId, topic.id)}
              disabled={topicIndex === 0 || loading}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => moveTopicDown(subjectId, termId, weekId, chapterId, topic.id)}
              disabled={topicIndex === totalTopics - 1 || loading}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-sm font-medium text-gray-500 min-w-[2rem]">
            {topic.order_number}
          </div>
          <TypeIcon className="h-4 w-4 text-gray-500" />
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  disabled={loading}
                />
                <Select value={editTopicType} onValueChange={setEditTopicType} disabled={loading}>
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {topicTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={saveEdit} disabled={loading}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div>
                <span className="text-sm font-medium">{topic.title}</span>
                {(topic.duration || topic.estimated_study_time) && (
                  <div className="text-xs text-gray-500">
                    {topic.duration && <span>{topic.duration}</span>}
                    {topic.duration && topic.estimated_study_time && <span> • </span>}
                    {topic.estimated_study_time && <span>Study time: {topic.estimated_study_time}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[topic.status]}>
            {topic.status}
          </Badge>
          <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing(`content-${topic.id}`, topic.title, '', '', topic.type)}
              disabled={loading}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => deleteItem('content', topic.id, [subjectId, termId, weekId, chapterId])}
              disabled={loading}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderChapter = (
    chapter: Chapter, 
    subjectId: string, 
    termId: string, 
    weekId: string
  ) => {
    const isEditing = editingItem === `chapter-${chapter.id}`;

    return (
      <div key={chapter.id} className="border rounded-lg bg-gray-50">
        <Collapsible open={chapter.isExpanded}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full p-3 hover:bg-gray-100 rounded-t-lg"
            onClick={() => toggleExpanded('chapter', chapter.id, [subjectId, termId, weekId])}
          >
            <div className="flex items-center space-x-2">
              {chapter.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <BookOpen className="h-4 w-4 text-blue-600" />
              {isEditing ? (
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-6 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    disabled={loading}
                  />
                  <Button variant="ghost" size="sm" onClick={saveEdit} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{chapter.title}</span>
                  {chapter.is_continuation && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      Continued
                    </Badge>
                  )}
                </div>
              )}
              <Badge variant="outline">{chapter.content.length} topics</Badge>
            </div>
            <div className="flex items-center space-x-1">
              {!isEditing && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} disabled={loading}>
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => startEditing(`chapter-${chapter.id}`, chapter.title)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Edit Chapter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => continueChapterToNextWeek(subjectId, termId, weekId, chapter.id)}>
                        <Copy className="mr-2 h-3 w-3" />
                        Continue to Next Week
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteItem('chapter', chapter.id, [subjectId, termId, weekId])}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete Chapter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddDialog('topic', { subjectId, termId, weekId, chapterId: chapter.id });
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-2 ml-6">
              {chapter.content
                .sort((a, b) => a.order_number - b.order_number)
                .map((topic, index) => renderTopic(topic, subjectId, termId, weekId, chapter.id, index, chapter.content.length))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderWeek = (week: Week, subjectId: string, termId: string) => {
    const isEditing = editingItem === `week-${week.id}`;

    return (
      <div key={week.id} className="border rounded-lg bg-blue-50">
        <Collapsible open={week.isExpanded}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full p-3 hover:bg-blue-100 rounded-t-lg"
            onClick={() => toggleExpanded('week', week.id, [subjectId, termId])}
          >
            <div className="flex items-center space-x-2">
              {week.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Clock className="h-4 w-4 text-blue-600" />
              {isEditing ? (
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-6 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    disabled={loading}
                  />
                  <Button variant="ghost" size="sm" onClick={saveEdit} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span className="font-medium">{week.title}</span>
              )}
              <Badge variant="outline">{week.chapters.length} chapters</Badge>
            </div>
            <div className="flex items-center space-x-1">
              {!isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(`week-${week.id}`, week.title);
                  }}
                  disabled={loading}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem('week', week.id, [subjectId, termId]);
                }}
                disabled={loading}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddDialog('chapter', { subjectId, termId, weekId: week.id });
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-2 ml-6">
              {week.chapters
                .sort((a, b) => a.order_number - b.order_number)
                .map(chapter => renderChapter(chapter, subjectId, termId, week.id))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderTerm = (term: Term, subjectId: string) => {
    const isEditing = editingItem === `term-${term.id}`;

    return (
      <div key={term.id} className="border rounded-lg bg-green-50">
        <Collapsible open={term.isExpanded}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full p-3 hover:bg-green-100 rounded-t-lg"
            onClick={() => toggleExpanded('term', term.id, [subjectId])}
          >
            <div className="flex items-center space-x-2">
              {term.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Calendar className="h-4 w-4 text-green-600" />
              {isEditing ? (
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-6 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    disabled={loading}
                  />
                  <Button variant="ghost" size="sm" onClick={saveEdit} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span className="font-medium">{term.title}</span>
              )}
              <Badge variant="outline">{term.weeks.length} weeks</Badge>
            </div>
            <div className="flex items-center space-x-1">
              {!isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(`term-${term.id}`, term.title);
                  }}
                  disabled={loading}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddDialog('week', { subjectId, termId: term.id });
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-2 ml-6">
              {term.weeks
                .sort((a, b) => a.order_number - b.order_number)
                .map(week => renderWeek(week, subjectId, term.id))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Content Hierarchy</CardTitle>
          <p className="text-sm text-gray-600">
            Organize content by Subject → Term → Week → Chapter → Topics. Click edit buttons to modify items, use plus buttons to add new items, arrow buttons to reorder topics, and "Continue to Next Week" to extend chapters across weeks.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {subjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No subjects found</p>
                <p className="text-sm text-gray-500">Create subjects first to manage content hierarchy</p>
              </div>
            ) : (
              subjects.map((subject) => {
                const isEditing = editingItem === `subject-${subject.id}`;

                return (
                  <div key={subject.id} className="border rounded-lg bg-purple-50">
                    <Collapsible open={subject.isExpanded}>
                      <CollapsibleTrigger
                        className="flex items-center justify-between w-full p-4 hover:bg-purple-100 rounded-t-lg"
                        onClick={() => toggleExpanded('subject', subject.id)}
                      >
                        <div className="flex items-center space-x-2">
                          {subject.isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          <BookOpen className="h-5 w-5 text-purple-600" />
                          {isEditing ? (
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Subject name"
                                disabled={loading}
                              />
                              <Select value={editLevel} onValueChange={setEditLevel} disabled={loading}>
                                <SelectTrigger className="h-8 w-24">
                                  <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {levels.map(level => (
                                    <SelectItem key={level} value={level}>{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={editExamBoard} onValueChange={setEditExamBoard} disabled={loading}>
                                <SelectTrigger className="h-8 w-28">
                                  <SelectValue placeholder="Board" />
                                </SelectTrigger>
                                <SelectContent>
                                  {examBoards.map(board => (
                                    <SelectItem key={board} value={board}>{board}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="sm" onClick={saveEdit} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold">{subject.name}</span>
                              <Badge className="bg-purple-100 text-purple-800">{subject.level}</Badge>
                              <Badge variant="outline">{subject.exam_board}</Badge>
                              {subject.school && (
                                <Badge variant="secondary" className="text-xs">{subject.school}</Badge>
                              )}
                            </>
                          )}
                        </div>
                        {!isEditing && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(`subject-${subject.id}`, subject.name, subject.level, subject.exam_board);
                            }}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-3 ml-6">
                          {subject.terms
                            .sort((a, b) => a.order_number - b.order_number)
                            .map(term => renderTerm(term, subject.id))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add New {addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={addFormData.title}
                onChange={(e) => setAddFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${addDialogType} title`}
                disabled={loading}
              />
            </div>

            {addDialogType === 'chapter' && (
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={addFormData.description}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the chapter content..."
                  rows={3}
                  disabled={loading}
                />
              </div>
            )}

            {addDialogType === 'topic' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="type">Content Type *</Label>
                  <Select 
                    value={addFormData.type} 
                    onValueChange={(value) => setAddFormData(prev => ({ ...prev, type: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topicTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration/Length</Label>
                  <Input
                    id="duration"
                    value={addFormData.duration}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 15 minutes, 24 pages, 20 questions"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Estimated Study Time</Label>
                  <Input
                    id="estimatedTime"
                    value={addFormData.estimatedTime}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                    placeholder="e.g., 30 minutes"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddItem}
                disabled={!addFormData.title.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1)}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}