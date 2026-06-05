"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isAdminProfile, getAllCourses, getCourseResources, addCourseResource, updateCourseResource, deleteCourseResource } from "@/lib/course";
import type { Course, CourseContentItem } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
// import type { CourseContentType } from "@/lib/types"; // Not directly used in component
import { 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  ExternalLink,
  Save,
  X
} from "lucide-react";

export default function AdminResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [resources, setResources] = useState<CourseContentItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<CourseContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'document',
    body: '',
    url: '',
    order: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      const profile = await getUserProfile(currentUser.uid);
      if (!isAdminProfile(profile)) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      
      try {
        const allCourses = await getAllCourses();
        setCourses(allCourses);
        
        if (allCourses.length > 0) {
          setSelectedCourse(allCourses[0]);
          await loadResources(allCourses[0].id);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadResources = async (courseId: string) => {
    try {
      const courseResources = await getCourseResources(courseId);
      setResources(courseResources);
    } catch (error) {
      console.error("Error loading resources:", error);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course);
      loadResources(courseId);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value
    }));
  };

  const handleSaveResource = async () => {
    if (!selectedCourse) return;
    
    try {
      // Prepare data for API call - exclude id and courseId which are not needed for creation/update
      const resourceData = {
        title: formData.title,
        type: formData.type as "document" | "video" | "link",
        body: formData.body,
        url: formData.url,
        order: formData.order
      };
      
      if (editingResource) {
        // Update existing resource
        await updateCourseResource(selectedCourse.id, editingResource.id, resourceData);
        setEditingResource(null);
      } else {
        // Create new resource
        await addCourseResource(selectedCourse.id, resourceData);
      }
      
      // Refresh resources
      await loadResources(selectedCourse.id);
      setShowForm(false);
      setFormData({
        title: '',
        type: 'document',
        body: '',
        url: '',
        order: 0
      });
    } catch (error) {
      console.error("Error saving resource:", error);
    }
  };

  const handleEditResource = (resource: CourseContentItem) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      type: resource.type as "document" | "video" | "link",
      body: resource.body || '',
      url: resource.url || '',
      order: resource.order
    });
    setShowForm(true);
  };

  const handleDeleteResource = async () => {
    if (!selectedCourse || !deleteResourceId) return;
    
    try {
      await deleteCourseResource(selectedCourse.id, deleteResourceId);
      await loadResources(selectedCourse.id);
      setIsDeleting(false);
      setDeleteResourceId(null);
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "link":
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "document":
        return <Badge variant="secondary">Document</Badge>;
      case "video":
        return <Badge variant="secondary">Video</Badge>;
      case "link":
        return <Badge variant="secondary">Link</Badge>;
      default:
        return <Badge variant="secondary">Resource</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading admin resources...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-white rounded-3xl shadow-lg p-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Resource Management</h1>
          <p className="text-slate-600 mb-8">
            Manage study materials and additional resources for your courses.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Course</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select onValueChange={handleCourseSelect} value={selectedCourse?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedCourse && (
                    <div className="mt-4 p-4 border border-slate-200 rounded-lg">
                      <h3 className="font-medium text-slate-900">{selectedCourse.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{selectedCourse.description}</p>
                      <p className="text-xs text-slate-400 mt-2">ID: {selectedCourse.id}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full mb-2" 
                        onClick={() => {
                          setEditingResource(null);
                          setFormData({
                            title: '',
                            type: 'document',
                            body: '',
                            url: '',
                            order: 0
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Resource
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingResource ? "Edit Resource" : "Add New Resource"}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Title</label>
                          <Input
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Resource title"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">Type</label>
                          <Select name="type" value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">Description</label>
                          <Textarea
                            name="body"
                            value={formData.body}
                            onChange={handleInputChange}
                            placeholder="Resource description"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">URL (for documents/videos/links)</label>
                          <Input
                            name="url"
                            value={formData.url}
                            onChange={handleInputChange}
                            placeholder="https://example.com/resource"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">Order</label>
                          <Input
                            name="order"
                            type="number"
                            value={formData.order}
                            onChange={handleInputChange}
                            placeholder="1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowForm(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveResource}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingResource ? "Update" : "Save"} Resource
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
            
            {/* Resources List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Course Resources</span>
                    <Badge variant="default">{resources.length} resources</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resources.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No resources found for this course. Add a new resource to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resources.map((resource) => (
                          <TableRow key={resource.id}>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                {getResourceIcon(resource.type)}
                                <div>
                                  <div className="font-medium">{resource.title}</div>
                                  <div className="text-sm text-slate-500 mt-1 line-clamp-2">{resource.body}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getResourceTypeBadge(resource.type)}
                            </TableCell>
                            <TableCell>
                              {resource.order}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditResource(resource)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog open={isDeleting && deleteResourceId === resource.id} onOpenChange={setIsDeleting}>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setDeleteResourceId(resource.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this resource? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteResource}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}