import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/faculty")({ component: FacultyPage });

type Faculty = { id: string; faculty_id: string; full_name: string; department: string; mobile: string | null; email: string | null; };
const empty = { faculty_id: "", full_name: "", department: "", mobile: "", email: "" };

function FacultyPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState(empty);

  const { data: faculty = [] } = useQuery({
    queryKey: ["faculty"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculty").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Faculty[];
    },
  });

  const filtered = faculty.filter(f => !search || f.full_name.toLowerCase().includes(search.toLowerCase()) || f.faculty_id.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (editing) {
      const { error } = await supabase.from("faculty").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("faculty").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Added");
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["faculty"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("faculty").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["faculty"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faculty</h1>
          <p className="text-muted-foreground">{faculty.length} faculty members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm(empty); }}><Plus /> Add Faculty</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Faculty</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {(["faculty_id","full_name","department","mobile","email"] as const).map(k => (
                <div key={k} className="space-y-1">
                  <Label className="capitalize">{k.replace("_"," ")}</Label>
                  <Input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Faculty ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
              <TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No faculty found.</TableCell></TableRow>
              ) : filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.faculty_id}</TableCell>
                  <TableCell className="font-medium">{f.full_name}</TableCell>
                  <TableCell>{f.department}</TableCell>
                  <TableCell className="text-sm">{f.email}</TableCell>
                  <TableCell className="text-sm">{f.mobile}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setForm(f as any); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
