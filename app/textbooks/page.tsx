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
import { Search, Filter, Plus, BookOpen, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { AddTextbookDialog } from '@/components/textbooks/AddTextbookDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const initialTextbooks = [
  {
    id: 1,
    title: 'Advanced Mathematics for A-Level',
    authors: ['John Smith', 'Mary Johnson'],
    publisher: 'Oxford University Press',
    edition: '3rd Edition',
    year: 2023,
    isbn: '978-0-19-123456-7',
    subject: 'Mathematics',
    level: 'A-Level',
    examBoard: 'ZIMSEC',
    description: 'Comprehensive mathematics textbook covering all A-Level topics with detailed explanations and practice exercises.',
    coverImage: '/textbook-covers/math-advanced.jpg',
    addedDate: '2024-01-15',
  },
  {
    id: 2,
    title: 'Physics Principles and Applications',
    authors: ['David Wilson'],
    publisher: 'Cambridge University Press',
    edition: '2nd Edition',
    year: 2022,
    isbn: '978-1-10-987654-3',
    subject: 'Physics',
    level: 'A-Level',
    examBoard: 'Cambridge',
    description: 'Modern physics textbook with real-world applications and laboratory experiments.',
    coverImage: '/textbook-covers/physics-principles.jpg',
    addedDate: '2024-01-14',
  },
  {
    id: 3,
    title: 'Organic Chemistry Fundamentals',
    authors: ['Sarah Brown', 'Michael Davis'],
    publisher: 'Pearson Education',
    edition: '4th Edition',
    year: 2023,
    isbn: '978-0-13-456789-0',
    subject: 'Chemistry',
    level: 'O-Level',
    examBoard: 'ZIMSEC',
    description: 'Essential organic chemistry concepts with step-by-step problem solving approaches.',
    coverImage: '/textbook-covers/chemistry-organic.jpg',
    addedDate: '2024-01-13',
  },
];

const levelColors = {
  'JC': 'bg-blue-100 text-blue-800',
  'O-Level': 'bg-green-100 text-green-800',
  'A-Level': 'bg-purple-100 text-purple-800',
};

export default function TextbooksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [textbooks, setTextbooks] = useState(initialTextbooks);

  const subjects = [...new Set(textbooks.map(book => book.subject))];
  const levels = ['JC', 'O-Level', 'A-Level'];

  const filteredTextbooks = textbooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         book.publisher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || book.subject === selectedSubject;
    const matchesLevel = selectedLevel === 'all' || book.level === selectedLevel;
    
    return matchesSearch && matchesSubject && matchesLevel;
  });

  const handleTextbookAdded = (newTextbook: any) => {
    setTextbooks(prev => [newTextbook, ...prev]);
  };

  const handleViewTextbook = (textbookId: number) => {
    console.log('Viewing textbook:', textbookId);
  };

  const handleEditTextbook = (textbookId: number) => {
    console.log('Editing textbook:', textbookId);
  };

  const handleDeleteTextbook = (textbookId: number) => {
    setTextbooks(prev => prev.filter(book => book.id !== textbookId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Textbooks</h1>
          <p className="text-gray-600 mt-2">Manage textbooks and educational resources</p>
        </div>
        <AddTextbookDialog
          trigger={
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Textbook</span>
            </Button>
          }
          onTextbookAdded={handleTextbookAdded}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{textbooks.length}</div>
            <div className="text-sm text-gray-600">Total Textbooks</div>
            <div className="text-xs text-success mt-1">+3 this month</div>
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
              {[...new Set(textbooks.map(book => book.publisher))].length}
            </div>
            <div className="text-sm text-gray-600">Publishers</div>
            <div className="text-xs text-gray-500 mt-1">Trusted sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {new Date().getFullYear() - Math.min(...textbooks.map(book => book.year)) + 1}
            </div>
            <div className="text-sm text-gray-600">Years Range</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.min(...textbooks.map(book => book.year))} - {Math.max(...textbooks.map(book => book.year))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Textbooks</CardTitle>
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
                placeholder="Search by title, author, or publisher..."
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
                  <TableHead>Book Details</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTextbooks.map((book) => (
                  <TableRow key={book.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{book.title}</div>
                          <div className="text-sm text-gray-500">{book.edition}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {book.authors.map((author, index) => (
                          <div key={index}>{author}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{book.publisher}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{book.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={levelColors[book.level as keyof typeof levelColors]}>
                        {book.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{book.year}</TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">{book.isbn}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTextbook(book.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTextbook(book.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Textbook
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTextbook(book.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Textbook
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