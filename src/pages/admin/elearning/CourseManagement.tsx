import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, GraduationCap, Users, Award, BookOpen, Video, FileQuestion, MoreHorizontal, Download, MessageSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockCourses = [
  { id: '1', title: 'React Masterclass', instructor: 'John Doe', type: 'on-demand', students: 1245, rating: 4.8, modules: 12, status: 'published', price: 99 },
  { id: '2', title: 'Python for Data Science', instructor: 'Jane Smith', type: 'live', students: 567, rating: 4.6, modules: 8, status: 'published', price: 149 },
  { id: '3', title: 'UX Design Fundamentals', instructor: 'Bob Wilson', type: 'hybrid', students: 234, rating: 4.9, modules: 6, status: 'draft', price: 79 },
];

const mockCertificates = [
  { id: '1', course: 'React Masterclass', student: 'Alice Brown', issuedAt: '2024-01-15', status: 'issued' },
  { id: '2', course: 'Python for Data Science', student: 'Charlie Green', issuedAt: '2024-01-14', status: 'issued' },
];

const stats = [
  { label: 'Total Courses', value: '156', change: '+8%', icon: BookOpen },
  { label: 'Active Students', value: '12,458', change: '+18%', icon: Users },
  { label: 'Certificates Issued', value: '3,456', change: '+25%', icon: Award },
  { label: 'Course Completion', value: '78%', change: '+5%', icon: GraduationCap },
];

export default function CourseManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      'on-demand': 'default',
      'live': 'secondary',
      'hybrid': 'outline'
    };
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  return (
    <AdminLayout
      title="eLearning / Education"
      description="Manage courses, quizzes, certificates, and student progress"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-green-500">{stat.change}</span>
                    </div>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes & Assignments</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="forums">Discussion Forums</TabsTrigger>
          </TabsList>

          {/* Courses */}
          <TabsContent value="courses" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">All Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Modules</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.instructor}</TableCell>
                        <TableCell>{getTypeBadge(course.type)}</TableCell>
                        <TableCell>{course.students.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{course.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>{course.modules} modules</TableCell>
                        <TableCell>${course.price}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit Course</DropdownMenuItem>
                              <DropdownMenuItem>Manage Modules</DropdownMenuItem>
                              <DropdownMenuItem>View Analytics</DropdownMenuItem>
                              <DropdownMenuItem>Student List</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes */}
          <TabsContent value="quizzes">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Quiz & Assignment management coming soon</p>
                <p className="text-sm mt-2">Create quizzes, assignments, and track completion</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students */}
          <TabsContent value="students">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Student management coming soon</p>
                <p className="text-sm mt-2">Track progress, engagement, and completion rates</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Issued Certificates</CardTitle>
                  <Button variant="outline" size="sm">
                    <Award className="h-4 w-4 mr-2" />
                    Certificate Templates
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.course}</TableCell>
                        <TableCell>{cert.student}</TableCell>
                        <TableCell className="text-muted-foreground">{cert.issuedAt}</TableCell>
                        <TableCell>
                          <Badge variant="default">{cert.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forums */}
          <TabsContent value="forums">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Discussion forums coming soon</p>
                <p className="text-sm mt-2">Enable student collaboration and Q&A</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
