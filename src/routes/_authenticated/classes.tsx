import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/classes")({ component: ClassesPage });

const empty = { name: "", course: "", year: "", section: "", subject: "", faculty_id: "" };

function ClassesPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*, faculty(full_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: faculty = [] } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: async () => (await supabase.from("faculty").select("id, full_name")).data ?? [],
  });

  const save = async () => {
    const payload = { ...form, faculty_id: form.faculty_id || null };
    const { error } = await supabase.from("classes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Class added");
    setOpen(false); setForm(empty);
    qc.invalidateQueries({ queryKey: ["classes"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("classes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["classes"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">{classes.length} classes</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus /> Add Class</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {(["name","course","year","section","subject"] as const).map(k => (
                  <div key={k} className="space-y-1">
                    <Label className="capitalize">{k}</Label>
                    <Input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                  </div>
                ))}
                <div className="space-y-1 col-span-2">
                  <Label>Assigned faculty</Label>
                  <Select value={form.faculty_id} onValueChange={v => setForm({ ...form, faculty_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                    <SelectContent>
                      {faculty.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        <CardHeader />
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Year</TableHead>
              <TableHead>Section</TableHead><TableHead>Subject</TableHead><TableHead>Faculty</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No classes yet.</TableCell></TableRow>
              ) : classes.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.course}</TableCell>
                  <TableCell>{c.year}</TableCell>
                  <TableCell>{c.section}</TableCell>
                  <TableCell>{c.subject}</TableCell>
                  <TableCell>{c.faculty?.full_name ?? "—"}</TableCell>
                  {isAdmin && <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
