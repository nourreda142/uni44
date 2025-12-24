import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { departmentSchema, groupSchema, sectionSchema, validateForm } from '@/lib/validation-schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Layers,
  FolderTree,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Group {
  id: string;
  name: string;
  departmentId: string;
}

interface Section {
  id: string;
  name: string;
  groupId: string;
}

type EntityType = 'department' | 'group' | 'section';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('department');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    groupId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, groupsRes, sectionsRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('groups').select('*').order('name'),
        supabase.from('sections').select('*').order('name'),
      ]);

      if (deptRes.data) {
        setDepartments(deptRes.data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
      }

      if (groupsRes.data) {
        setGroups(groupsRes.data.map(g => ({
          id: g.id,
          name: g.name,
          departmentId: g.department_id,
        })));
      }

      if (sectionsRes.data) {
        setSections(sectionsRes.data.map(s => ({
          id: s.id,
          name: s.name,
          groupId: s.group_id,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on entity type
    let validationError: string | null = null;
    let validatedData: { name: string; code?: string; departmentId?: string; groupId?: string } | null = null;
    
    if (entityType === 'department') {
      const result = validateForm(departmentSchema, { name: formData.name, code: formData.code });
      validationError = result.error;
      if (result.data) validatedData = { name: result.data.name, code: result.data.code };
    } else if (entityType === 'group') {
      const result = validateForm(groupSchema, { name: formData.name, departmentId: formData.departmentId });
      validationError = result.error;
      if (result.data) validatedData = { name: result.data.name, departmentId: result.data.departmentId };
    } else {
      const result = validateForm(sectionSchema, { name: formData.name, groupId: formData.groupId });
      validationError = result.error;
      if (result.data) validatedData = { name: result.data.name, groupId: result.data.groupId };
    }

    if (validationError || !validatedData) {
      toast({
        title: 'Validation Error',
        description: validationError || 'Invalid data',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      if (entityType === 'department' && validatedData.code) {
        if (editingId) {
          const { error } = await supabase
            .from('departments')
            .update({ name: validatedData.name, code: validatedData.code.toUpperCase() })
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('departments')
            .insert({ name: validatedData.name, code: validatedData.code.toUpperCase() });
          if (error) throw error;
        }
      } else if (entityType === 'group' && validatedData.departmentId) {
        if (editingId) {
          const { error } = await supabase
            .from('groups')
            .update({ name: validatedData.name, department_id: validatedData.departmentId })
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('groups')
            .insert({ name: validatedData.name, department_id: validatedData.departmentId });
          if (error) throw error;
        }
      } else if (entityType === 'section' && validatedData.groupId) {
        if (editingId) {
          const { error } = await supabase
            .from('sections')
            .update({ name: validatedData.name, group_id: validatedData.groupId })
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('sections')
            .insert({ name: validatedData.name, group_id: validatedData.groupId });
          if (error) throw error;
        }
      }

      toast({
        title: 'Success',
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${editingId ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to save ${entityType}`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: EntityType, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all related data.`)) return;

    try {
      const table = type === 'department' ? 'departments' : type === 'group' ? 'groups' : 'sections';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Success', description: `${type} deleted successfully` });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to delete ${type}`,
        variant: 'destructive',
      });
    }
  };

  const openAdd = (type: EntityType, parentId?: string) => {
    setEntityType(type);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      departmentId: type === 'group' && parentId ? parentId : '',
      groupId: type === 'section' && parentId ? parentId : '',
    });
    setDialogOpen(true);
  };

  const openEdit = (type: EntityType, item: any) => {
    setEntityType(type);
    setEditingId(item.id);
    setFormData({
      name: item.name,
      code: item.code || '',
      departmentId: item.departmentId || '',
      groupId: item.groupId || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', departmentId: '', groupId: '' });
  };

  const getGroupsForDepartment = (deptId: string) => groups.filter(g => g.departmentId === deptId);
  const getSectionsForGroup = (groupId: string) => sections.filter(s => s.groupId === groupId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Departments & Structure
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage departments, groups, and sections
            </p>
          </div>
          <Button variant="hero" onClick={() => openAdd('department')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              Organization Structure
            </CardTitle>
            <CardDescription>
              {departments.length} departments, {groups.length} groups, {sections.length} sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No departments found. Add your first department to get started.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-2">
                {departments.map((dept) => {
                  const deptGroups = getGroupsForDepartment(dept.id);
                  return (
                    <AccordionItem
                      key={dept.id}
                      value={dept.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 flex-1">
                          <Building2 className="w-5 h-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">{dept.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Code: {dept.code} • {deptGroups.length} groups
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdd('group', dept.id)}
                            title="Add Group"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit('department', dept)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete('department', dept.id, dept.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        {deptGroups.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No groups in this department
                          </div>
                        ) : (
                          <div className="space-y-3 ml-4">
                            {deptGroups.map((group) => {
                              const groupSections = getSectionsForGroup(group.id);
                              return (
                                <div key={group.id} className="border rounded-lg p-3 bg-muted/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-secondary" />
                                      <span className="font-medium">{group.name}</span>
                                      <Badge variant="secondary">{groupSections.length} sections</Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openAdd('section', group.id)}
                                        title="Add Section"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openEdit('group', group)}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete('group', group.id, group.name)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {groupSections.length > 0 && (
                                    <div className="flex flex-wrap gap-2 ml-6">
                                      {groupSections.map((section) => (
                                        <div
                                          key={section.id}
                                          className="flex items-center gap-1 bg-background border rounded px-2 py-1"
                                        >
                                          <Layers className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-sm">{section.name}</span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 ml-1"
                                            onClick={() => openEdit('section', section)}
                                          >
                                            <Pencil className="w-2 h-2" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete('section', section.id, section.name)}
                                          >
                                            <Trash2 className="w-2 h-2" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit' : 'Add'} {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the details below' : `Create a new ${entityType}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Enter ${entityType} name`}
                  required
                />
              </div>

              {entityType === 'department' && (
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CS, IT, IS"
                    required
                  />
                </div>
              )}

              {entityType === 'group' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {entityType === 'section' && (
                <div className="space-y-2">
                  <Label htmlFor="group">Group *</Label>
                  <Select
                    value={formData.groupId}
                    onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => {
                        const dept = departments.find(d => d.id === group.departmentId);
                        return (
                          <SelectItem key={group.id} value={group.id}>
                            {dept?.code} - {group.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}