import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendance")({ component: AttendancePage });

type Status = "present" | "absent" | "late";

function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [classId, setClassId] = useState<string>("");
  const [marks, setMarks] = useState<Record<string, Status>>({});

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [],
  });

  const selectedClass = classes.find((c: any) => c.id === classId);

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-class", selectedClass?.course, selectedClass?.year, selectedClass?.section],
    enabled: !!selectedClass,
    queryFn: async () => {
      const { data } = await supabase
        .from("students").select("*")
        .eq("course", selectedClass.course)
        .eq("year", selectedClass.year)
        .eq("section", selectedClass.section)
        .order("full_name");
      return data ?? [];
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["attendance-existing", classId, date],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("class_id", classId).eq("date", date);
      return data ?? [];
    },
  });

  const existingMap = useMemo(() => {
    const m: Record<string, Status> = {};
    existing.forEach((r: any) => { m[r.student_id] = r.status; });
    return m;
  }, [existing]);

  const getStatus = (sid: string): Status => marks[sid] ?? existingMap[sid] ?? "present";

  const save = async () => {
    if (!classId) return toast.error("Select a class");
    const rows = students.map((s: any) => ({
      student_id: s.id, class_id: classId, date,
      status: getStatus(s.id), marked_by: user?.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,class_id,date" });
    if (error) return toast.error(error.message);
    toast.success(`Attendance saved for ${rows.length} students`);
    setMarks({});
    qc.invalidateQueries({ queryKey: ["attendance-existing"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["recent-attendance"] });
  };

  const markAll = (status: Status) => {
    const m: Record<string, Status> = {};
    students.forEach((s: any) => { m[s.id] = status; });
    setMarks(m);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mark Attendance</h1>
        <p className="text-muted-foreground">Select a class and date, then mark students</p>
      </div>

      <Card>
        <CardHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => markAll("present")} disabled={!classId}><CheckCircle2 className="text-success" /> All Present</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!classId ? (
            <p className="text-center text-muted-foreground py-8">Select a class to begin.</p>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students enrolled in this class.</p>
          ) : (
            <>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {students.map((s: any) => {
                    const st = getStatus(s.id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.student_id}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            {([
                              { v: "present", Icon: CheckCircle2, cls: "text-success" },
                              { v: "late", Icon: Clock, cls: "text-warning-foreground" },
                              { v: "absent", Icon: XCircle, cls: "text-destructive" },
                            ] as const).map(({ v, Icon, cls }) => (
                              <Button
                                key={v}
                                size="sm"
                                variant={st === v ? "default" : "outline"}
                                onClick={() => setMarks({ ...marks, [s.id]: v })}
                                className="capitalize"
                              >
                                <Icon className={st !== v ? cls : ""} /> {v}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Button onClick={save}>Save Attendance</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
