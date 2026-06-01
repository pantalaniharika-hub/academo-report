import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/my-attendance")({ component: MyAttendance });

function MyAttendance() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-attendance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("*").eq("user_id", user!.id).maybeSingle();
      if (!student) return { student: null, records: [] };
      const { data: records } = await supabase.from("attendance")
        .select("*, classes(name, subject)")
        .eq("student_id", student.id)
        .order("date", { ascending: false });
      return { student, records: records ?? [] };
    },
  });

  if (!data?.student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No student profile linked</CardTitle>
          <CardDescription>Ask an administrator to link your account to a student record.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = data.records.length || 1;
  const present = data.records.filter(r => r.status === "present").length;
  const late = data.records.filter(r => r.status === "late").length;
  const absent = data.records.filter(r => r.status === "absent").length;
  const pct = Math.round(((present + late * 0.5) / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
        <p className="text-muted-foreground">{data.student.full_name} · {data.student.course} {data.student.year}-{data.student.section}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overall Attendance: {pct}%</CardTitle>
          <CardDescription>{present} present · {late} late · {absent} absent (out of {data.records.length})</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.records.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No records yet.</TableCell></TableRow>
              ) : data.records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.classes?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      r.status === "present" ? "bg-success/10 text-success" :
                      r.status === "late" ? "bg-warning/10 text-warning-foreground" :
                      "bg-destructive/10 text-destructive"
                    }`}>{r.status}</span>
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
