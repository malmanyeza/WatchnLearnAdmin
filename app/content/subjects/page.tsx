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
import { Search, Filter, Plus, BookOpen, Users, FileText, Loader2, RefreshCw } from 'lucide-react';
import { AddSubjectDialog } from '@/components/content/AddSubjectDialog';
import { subjectOperations } from '@/lib/database';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Subject {
  id: string;
  name: string;
  description?: string;
  level: string;
  exam_board: string;
  school_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  terms?: any[];
  subject_teachers?: any[];
}

const levelColors = {
  'JC': 'bg-blue-100 text-blue-800',
  'O-Level': 'bg-green-100 text-green-800',
  'A-Level': 'bg-purple-100 text-purple-800',
};

const statusColors = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-gray-100 text-gray-600',
  draft: 'bg-warning/10 text-warning',
};

export default function SubjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedExamBoard, setSelectedExamBoard] = useState('all');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subjects from database
  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const subjectsData = await subjectOperations.getSubjects();
      setSubjects(subjectsData || []);
    } catch (error: any) {
      console.error('Error loading subjects:', error);
      setError(error.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = selectedLevel === 'all' || subject.level === selectedLevel;
    const matchesExamBoard = selectedExamBoard === 'all' || subject.exam_board === selectedExamBoard;
    
    return matchesSearch && matchesLevel && matchesExamBoard;
  });

  const handleSubjectAdded = (newSubject: Subject) => {
    setSubjects(prev => [newSubject, ...prev]);
  };

  // Calculate statistics
  const totalEnrollments = subjects.reduce((acc, subject) => {
    // This would come from user_enrollments table in a real implementation
    return acc + Math.floor(Math.random() * 1000); // Mock data for now
  }, 0);

  const totalContentItems = subjects.reduce((acc, subject) => {
    // This would be calculated from the content hierarchy
    return acc + Math.floor(Math.random() * 50); // Mock data for now
  }, 0);

  const avgCompletionRate = subjects.length > 0 ? 
    (subjects.reduce((acc) => acc + Math.floor(Math.random() * 40) + 60, 0) / subjects.length).toFixed(1) : 
    '0';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
            <p className="text-gray-600 mt-2">Manage subjects across all levels and exam boards</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600">Loading subjects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-gray-600 mt-2">Manage subjects across all levels and exam boards</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadSubjects} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddSubjectDialog
            trigger={
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Subject</span>
              </Button>
            }
            onSubjectAdded={handleSubjectAdded}
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
              onClick={loadSubjects} 
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
                <div className="text-sm text-gray-600">Total Subjects</div>
                <div className="text-xs text-success mt-1">Active subjects</div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalEnrollments.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Enrollments</div>
                <div className="text-xs text-success mt-1">Across all subjects</div>
              </div>
              <div className="p-3 bg-secondary/10 rounded-full">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalContentItems}
                </div>
                <div className="text-sm text-gray-600">Content Items</div>
                <div className="text-xs text-success mt-1">Total content pieces</div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {avgCompletionRate}%
                </div>
                <div className="text-sm text-gray-600">Avg. Completion</div>
                <div className="text-xs text-success mt-1">Student progress</div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Subjects</CardTitle>
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
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="JC">JC</SelectItem>
                <SelectItem value="O-Level">O-Level</SelectItem>
                <SelectItem value="A-Level">A-Level</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedExamBoard} onValueChange={setSelectedExamBoard}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Exam Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                <SelectItem value="ZIMSEC">ZIMSEC</SelectItem>
                <SelectItem value="Cambridge">Cambridge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Exam Board</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Content Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        {subjects.length === 0 ? (
                          <>
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No subjects found</p>
                            <p className="text-sm">Get started by adding your first subject</p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-medium mb-2">No subjects match your filters</p>
                            <p className="text-sm">Try adjusting your search criteria</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject) => (
                    <TableRow key={subject.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{subject.name}</div>
                            {subject.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {subject.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={levelColors[subject.level as keyof typeof levelColors]}>
                          {subject.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{subject.exam_board}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {subject.subject_teachers?.length || 0} teachers
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {/* This would be calculated from the content hierarchy */}
                        {Math.floor(Math.random() * 50)} items
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[subject.is_active ? 'active' : 'inactive']}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(subject.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}