"use client";


import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isAdminProfile, getAllCourses, getCourseResources, addCourseResource, updateCourseResource, deleteCourseResource, duplicateCourseResource } from "@/lib/course";
import type { CourseResourceCreateData } from "@/lib/course";
import { isFlashcard } from "@/lib/types";
import type { Course, CourseContentItem, CourseContentType } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { getResourceIcon, getResourceTypeBadge } from "@/components/resources/resource-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription, 
  DialogFooter, 
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
import {
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Copy
} from "lucide-react";

export default function AdminResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [resources, setResources] = useState<CourseContentItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<CourseContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'document',
    body: '',
    url: '',
    order: 0,
    front: '',
    back: ''
  });
  const [formErrors, setFormErrors] = useState<{ title?: string; front?: string; back?: string; url?: string; order?: string }>({});
  const [saving, setSaving] = useState(false);
  // "Copy to courses" dialog state — copyResource !== null keeps it open.
  const [copyResource, setCopyResource] = useState<CourseContentItem | null>(null);
  const [copyTargetIds, setCopyTargetIds] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);
  // Monotonic counter guarding against out-of-order resource loads when the
  // selected course changes quickly — only the latest request may update state.
  const loadSequenceRef = useRef(0);

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
        toast({
          title: "Could not load courses",
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadResources = async (courseId: string) => {
    // Only the most recent request may update state — switching courses
    // quickly must never show one course's resources under another.
    const requestId = ++loadSequenceRef.current;
    setLoadError(null);
    try {
      const courseResources = await getCourseResources(courseId);
      if (requestId === loadSequenceRef.current) {
        setResources(courseResources);
      }
    } catch (error) {
      console.error("Error loading resources:", error);
      if (requestId === loadSequenceRef.current) {
        setLoadError("Failed to load resources. Please try again.");
      }
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

  const validateForm = (): boolean => {
    const errors: { title?: string; front?: string; back?: string; url?: string; order?: string } = {};
    if (!formData.title.trim()) errors.title = "Title is required.";
    if (formData.type === "flashcard") {
      if (!formData.front.trim()) errors.front = "Front content is required.";
      if (!formData.back.trim()) errors.back = "Back content is required.";
    }
    const trimmedUrl = formData.url.trim();
    if (trimmedUrl && !/^https:\/\/\S+$/.test(trimmedUrl)) {
      errors.url = "URL must be a secure link starting with https://";
    }
    if (formData.order < 0) {
      errors.order = "Order must be 0 or greater.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveResource = async () => {
    if (!selectedCourse) return;
    
    if (!validateForm()) {
      toast({
        title: "Missing information",
        description: "Please fill in the highlighted fields before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const isFlashcardType = formData.type === "flashcard";
      const resourceData: CourseResourceCreateData = {
        title: formData.title.trim(),
        type: formData.type as CourseContentType,
        body: isFlashcardType ? "" : formData.body,
        url: isFlashcardType ? "" : formData.url,
        order: formData.order,
        ...(isFlashcardType ? { front: formData.front.trim(), back: formData.back.trim() } : {}),
      };
      
      if (editingResource) {
        await updateCourseResource(selectedCourse.id, editingResource.id, resourceData);
        setEditingResource(null);
        toast({ title: "Resource updated", description: `"${resourceData.title}" has been saved.` });
      } else {
        await addCourseResource(selectedCourse.id, resourceData);
        toast({ title: "Resource created", description: `"${resourceData.title}" has been added to ${selectedCourse.title}.` });
      }
      
      await loadResources(selectedCourse.id);
      setShowForm(false);
      setFormData({
        title: '',
        type: 'document',
        body: '',
        url: '',
        order: 0,
        front: '',
        back: ''
      });
      setFormErrors({});
    } catch (error) {
      console.error("Error saving resource:", error);
      toast({
        title: "Could not save resource",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditResource = (resource: CourseContentItem) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      type: resource.type as "document" | "video" | "link" | "flashcard",
      body: resource.body || '',
      url: resource.url || '',
      order: resource.order,
      front: isFlashcard(resource) ? resource.front : '',
      back: isFlashcard(resource) ? resource.back : ''
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDeleteResource = async () => {
    if (!selectedCourse || !deleteResourceId) return;
    
    const resourceTitle = resources.find((r) => r.id === deleteResourceId)?.title ?? "Resource";
    try {
      await deleteCourseResource(selectedCourse.id, deleteResourceId);
      await loadResources(selectedCourse.id);
      toast({
        title: "Resource deleted",
        description: `"${resourceTitle}" has been removed from ${selectedCourse.title}.`,
      });
      setIsDeleting(false);
      setDeleteResourceId(null);
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({
        title: "Could not delete resource",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCopyTarget = (courseId: string) => {
    setCopyTargetIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleCopyResource = async () => {
    if (!selectedCourse || !copyResource || copyTargetIds.length === 0) return;

    const sourceTitle = copyResource.title;
    const targets = courses.filter(c => copyTargetIds.includes(c.id));
    setCopying(true);
    try {
      const results = await Promise.allSettled(
        targets.map(course => duplicateCourseResource(selectedCourse.id, copyResource.id, course.id))
      );

      const failures: { course: Course; reason: unknown }[] = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failures.push({ course: targets[index], reason: result.reason });
        }
      });
      failures.forEach(({ reason }) => console.error("Error copying resource:", reason));

      if (failures.length === 0) {
        toast({
          title: "Resource copied",
          description: `"${sourceTitle}" has been copied to ${targets.length === 1 ? targets[0].title : `${targets.length} courses`}.`,
        });
        setCopyResource(null);
        setCopyTargetIds([]);
      } else {
        const failedNames = failures.map(({ course }) => course.title).join(", ");
        toast({
          title: failures.length === targets.length ? "Could not copy resource" : "Resource partially copied",
          description: failures.length === targets.length
            ? "Something went wrong. Please try again."
            : `Copied to some courses, but failed for: ${failedNames}.`,
          variant: "destructive",
        });
        // Keep only the failed targets selected so a retry is one click away.
        setCopyTargetIds(failures.map(({ course }) => course.id));
      }
    } finally {
      setCopying(false);
    }
  };

  const otherCourses = courses.filter(c => c.id !== selectedCourse?.id);

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
          <BackToAdminButton />
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
                          setFormErrors({});
                          setFormData({
                            title: '',
                            type: 'document',
                            body: '',
                            url: '',
                            order: resources.length + 1,
                            front: '',
                            back: ''
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
                          {formErrors.title && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">Type</label>
                          <Select name="type" value={formData.type} onValueChange={(value) => { setFormData({ ...formData, type: value }); setFormErrors({}); }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="flashcard">Flashcard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {formData.type === 'flashcard' && (
                          <>
                            <div>
                              <label className="text-sm font-medium text-slate-700">Front</label>
                              <Input
                                name="front"
                                value={formData.front}
                                onChange={handleInputChange}
                                placeholder="Front of flashcard"
                              />
                              {formErrors.front && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.front}</p>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700">Back</label>
                              <Textarea
                                name="back"
                                value={formData.back}
                                onChange={handleInputChange}
                                placeholder="Back of flashcard"
                                rows={3}
                              />
                              {formErrors.back && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.back}</p>
                              )}
                            </div>
                          </>
                        )}
                        
                        {formData.type !== 'flashcard' && (
                          <>
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
                          {formErrors.url && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.url}</p>
                          )}
                        </div>
                          </>
                        )}
                        
                        <div>
                          <label className="text-sm font-medium text-slate-700">Order</label>
                          <Input
                            name="order"
                            type="number"
                            min={0}
                            value={formData.order}
                            onChange={handleInputChange}
                            placeholder="1"
                          />
                          {formErrors.order && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.order}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowForm(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveResource} disabled={saving}>
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? "Saving..." : editingResource ? "Update" : "Save"} Resource
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
                  {loadError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">{loadError}</p>
                      <Button
                        className="mt-3"
                        variant="outline"
                        onClick={() => selectedCourse && loadResources(selectedCourse.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : resources.length === 0 ? (
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
                                  <div className="text-sm text-slate-500 mt-1 line-clamp-2">
                                    {isFlashcard(resource) ? resource.front : resource.body}
                                  </div>
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
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title="Copy to another course"
                                  onClick={() => { setCopyResource(resource); setCopyTargetIds([]); }}
                                >
                                  <Copy className="h-4 w-4" />
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
                                      <AlertDialogCancel onClick={() => setDeleteResourceId(null)}>Cancel</AlertDialogCancel>
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

                  {/* Copy-to-courses dialog (controlled by copyResource) */}
                  <Dialog open={!!copyResource} onOpenChange={(open) => { if (!open) { setCopyResource(null); setCopyTargetIds([]); } }}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Copy resource to other courses</DialogTitle>
                        <DialogDescription>
                          Each copy is an independent resource — editing a copy later will not change this one.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="mt-2 space-y-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="font-medium text-slate-900">{copyResource?.title}</p>
                          <p className="text-xs text-slate-500 mt-1">Copying from: {selectedCourse?.title}</p>
                        </div>

                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {otherCourses.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4 text-center">
                              There are no other courses yet. Create another course first.
                            </p>
                          ) : (
                            otherCourses.map(course => (
                              <label
                                key={course.id}
                                htmlFor={`copy-target-${course.id}`}
                                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-primary transition"
                              >
                                <Checkbox
                                  id={`copy-target-${course.id}`}
                                  checked={copyTargetIds.includes(course.id)}
                                  onCheckedChange={() => toggleCopyTarget(course.id)}
                                />
                                <span className="text-sm font-medium text-slate-700">{course.title}</span>
                              </label>
                            ))
                          )}
                        </div>

                        <p className="text-xs text-slate-400">
                          The copy is appended at the end of the target course&apos;s resources.
                        </p>
                      </div>

                      <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => { setCopyResource(null); setCopyTargetIds([]); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleCopyResource} disabled={copying || copyTargetIds.length === 0}>
                          <Copy className="h-4 w-4 mr-2" />
                          {copying ? "Copying..." : `Copy to ${copyTargetIds.length} ${copyTargetIds.length === 1 ? "course" : "courses"}`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}