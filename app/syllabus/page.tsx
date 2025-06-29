'use client';

import { useState } from 'react';
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
import { Search, Filter, Plus, FileText, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { AddSyllabusDialog } from '@/components/syllabus/AddSyllabusDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const initialSyllabi = [
  {
    id: 1,
    subject: 'Mathematics',
    level: 'A-Level',
    examBoard: 'ZIMSEC',
    year: 2024,
    overview: 'Comprehensive mathematics syllabus covering algebra, calculus, statistics, and mechanics.',
    totalTopics: 45,
    papers: [
      {
        id: 1,
        name: 'Paper 1',
        topics: ['Number and Set Notation', 'Algebra', 'Functions', 'Coordinate Geometry']
      },
      {
        id: 2,
        name: 'Paper 2',
        topics: ['Calculus', 'Statistics', 'Probability', 'Mechanics']
      }
    ],
    syllabusFile: 'mathematics-a-level-2024.pdf',
    assessmentFile: 'mathematics-assessment-objectives.pdf',
    specimenFile: 'mathematics-specimen-papers.pdf',
    addedDate: '2024-01-15',
  },
  {
    id: 2,
    subject: 'Physics',
    level: 'A-Level',
    examBoard: 'Cambridge',
    year: 2024,
    overview: 'Advanced physics syllabus covering mechanics, waves, electricity, and modern physics.',
    totalTopics: 38,
    papers: [
      {
        id: 1,
        name: 'Paper 1',
        topics: ['Mechanics', 'Waves', 'Oscillations']
      },
      {
        id: 2,
        name: 'Paper 2',
        topics: ['Electricity and Magnetism', 'Atomic Physics', 'Nuclear Physics']
      }
    ],
    syllabusFile: 'physics-a-level-2024.pdf',
    assessmentFile: 'physics-assessment-objectives.pdf',
    specimenFile: 'physics-specimen-papers.pdf',
    addedDate: '2024-01-14',
  },
];

const levelColors = {
  'JC': 'bg-blue-100 text-blue-800',
  'O-Level': 'bg-green-100 text-green-800',
  'A-Level': 'bg-purple-100 text-purple-800',
};

export default function SyllabusPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [syllabi, setSyllabi] = useState(initialSyllabi);

  const subjects = [...new Set(syllabi.map(syllabus => syllabus.subject))];
  const levels = ['JC', 'O-Level', 'A-Level'];

  const filteredSyllabi = syllabi.filter(syllabus => {
    const matchesSearch = syllabus.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         syllabus.overview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || syllabus.subject === selectedSubject;
    const matchesLevel = selectedLevel === 'all' || syllabus.level === selectedLevel;
    
    return matchesSearch && matchesSubject && matchesLevel;
  });

  const handleSyllabusAdded = (newSyllabus: any) => {
    setSyllabi(prev => [newSyllabus, ...prev]);
  };

  const handleViewSyllabus = (syllabusId: number) => {
    console.log('Viewing syllabus:', syllabusId);
  };

  const handleEditSyllabus = (syllabusId: number) => {
    console.log('Editing syllabus:', syllabusId);
  };

  const handleDeleteSyllabus = (syllabusId: number) => {
    setSyllabi(prev => prev.filter(syllabus => syllabus.id !== syllabusId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Syllabus Management</h1>
          <p className="text-gray-600 mt-2">Manage examination syllabi and curriculum documents</p>
        </div>
        <AddSyllabusDialog
          trigger={
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Syllabus</span>
            </Button>
          }
          onSyllabusAdded={handleSyllabusAdded}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{syllabi.length}</div>
            <div className="text-sm text-gray-600">Total Syllabi</div>
            <div className="text-xs text-success mt-1">+2 this month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
            <div className="text-sm text-gray-600">Subjects Covered</div>
            <div className="text-xs text-gray-500 mt-1">Across all levels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syllabi.reduce((acc, syllabus) => acc + syllabus.totalTopics, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Topics</div>
            <div className="text-xs text-gray-500 mt-1">All syllabi combined</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syllabi.reduce((acc, syllabus) => acc + syllabus.papers.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Examination Papers</div>
            <div className="text-xs text-gray-500 mt-1">Across all subjects</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Syllabi</CardTitle>
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
                placeholder="Search syllabi by subject or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Syllabus Details</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Exam Board</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Topics</TableHead>
                  <TableHead>Papers</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSyllabi.map((syllabus) => (
                  <TableRow key={syllabus.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {syllabus.subject} Syllabus
                          </div>
                          <div className="text-sm text-gray-500">
                            Added {new Date(syllabus.addedDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{syllabus.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={levelColors[syllabus.level as keyof typeof levelColors]}>
                        {syllabus.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{syllabus.examBoard}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{syllabus.year}</TableCell>
                    <TableCell className="text-sm text-gray-600">{syllabus.totalTopics}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {syllabus.papers.map(paper => (
                          <Badge key={paper.id} variant="secondary" className="text-xs">
                            {paper.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewSyllabus(syllabus.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditSyllabus(syllabus.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Syllabus
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSyllabus(syllabus.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Syllabus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}