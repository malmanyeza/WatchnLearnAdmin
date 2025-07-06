'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, MoreHorizontal, BookOpen, Video, FileText, Loader2, RefreshCw } from 'lucide-react';
import { AddContentDialog } from '@/components/content/AddContentDialog';
import { ContentHierarchy } from '@/components/content/ContentHierarchy';
import { subjectOperations } from '@/lib/database';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Subject {
  id: string;
  name: string;
  level: string;
  exam_board: string;
  terms: Term[];
  subject_teachers?: any[];
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
  content: Content[];
}

interface Content {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz' | 'notes';
  status: string;
  view_count: number;
  duration?: string;
  estimated_study_time?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  published: 'bg-success/10 text-success',
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-warning/10 text-warning',
  archived: 'bg-destructive/10 text-destructive',
};

const typeIcons = {
  video: Video,
  pdf: FileText,
  quiz: BookOpen,
  notes: FileText,
};

const levelColors = {
  'JC': 'bg-blue-100 text-blue-800',
  'O-Level': 'bg-green-100 text-green-800',
  'A-Level': 'bg-purple-100 text-purple-800',
};

export default function ContentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subjects and content from database
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading subjects from database...');
      const subjectsData = await subjectOperations.getSubjects();
      console.log('Loaded subjects:', subjectsData?.length || 0);
      
      if (subjectsData) {
        setSubjects(subjectsData);
        
        // Extract all content from the hierarchical structure
        const extractedContent: Content[] = [];
        subjectsData.forEach(subject => {
          subject.terms?.forEach(term => {
            term.weeks?.forEach(week => {
              week.chapters?.forEach(chapter => {
                chapter.content?.forEach(content => {
                  extractedContent.push({
                    ...content,
                    subject: subject.name,
                    level: subject.level,
                    examBoard: subject.exam_board,
                  } as any);
                });
              });
            });
          });
        });
        
        console.log('Extracted content items:', extractedContent.length);
        setAllContent(extractedContent);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter content based on search and filters
  const filteredContent = allContent.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item as any).subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleContentAdded = (newContent: any) => {
    // Reload data to get the updated structure
    loadData();
  };

  const handleSubjectAdded = (newSubject: any) => {
    // Reload data to get the updated structure
    loadData();
  };

  // Calculate statistics
  const totalContent = allContent.length;
  const publishedContent = allContent.filter(item => item.status === 'published').length;
  const reviewContent = allContent.filter(item => item.status === 'review').length;
  const draftContent = allContent.filter(item => item.status === 'draft').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
            <p className="text-gray-600 mt-2">Manage educational content across all subjects and levels</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600 mt-2">Manage educational content across all subjects and levels</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddContentDialog
            trigger={
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Content</span>
              </Button>
            }
            onContentAdded={handleContentAdded}
            subjects={subjects}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              className="ml-2"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{totalContent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Content</div>
            <div className="text-xs text-success mt-1">
              {subjects.length} subjects
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{publishedContent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Published</div>
            <div className="text-xs text-success mt-1">
              {totalContent > 0 ? Math.round((publishedContent / totalContent) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{reviewContent}</div>
            <div className="text-sm text-gray-600">In Review</div>
            <div className="text-xs text-warning mt-1">
              {totalContent > 0 ? Math.round((reviewContent / totalContent) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{draftContent}</div>
            <div className="text-sm text-gray-600">Drafts</div>
            <div className="text-xs text-gray-500 mt-1">
              {totalContent > 0 ? Math.round((draftContent / totalContent) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Content List</TabsTrigger>
          <TabsTrigger value="hierarchy">Content Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Content</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search content by title, subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContent.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="text-gray-500">
                            {allContent.length === 0 ? (
                              <>
                                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium mb-2">No content found</p>
                                <p className="text-sm">Start by adding subjects and creating content</p>
                              </>
                            ) : (
                              <>
                                <p className="text-lg font-medium mb-2">No content matches your filters</p>
                                <p className="text-sm">Try adjusting your search criteria</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContent.map((item) => {
                        const TypeIcon = typeIcons[item.type as keyof typeof typeIcons];
                        return (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-primary/10 rounded-md">
                                  <TypeIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{item.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {item.type === 'video' && item.duration && `${item.duration}`}
                                    {item.estimated_study_time && `Study time: ${item.estimated_study_time}`}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{(item as any).subject}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={levelColors[(item as any).level as keyof typeof levelColors]}>
                                {(item as any).level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.view_count.toLocaleString()} views
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(item.updated_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <ContentHierarchy 
            subjects={subjects} 
            onDataChange={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}