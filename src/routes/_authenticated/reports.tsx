import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["report", from, to, statusFilter],
    queryFn: async () => {
      let q = supabase.from("attendance")
        .select("id, date, status, students(student_id, full_name, course, year, section), classes(name, subject)")
        .gte("date", from).lte("date", to).order("date", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const byStudent: Record<string, { name: string; sid: string; total: number; present: number; late: number; absent: number }> = {};
    rows.forEach((r: any) => {
      const k = r.students?.student_id ?? "—";
      if (!byStudent[k]) byStudent[k] = { name: r.students?.full_name ?? "—", sid: k, total: 0, present: 0, late: 0, absent: 0 };
      byStudent[k].total++;
      (byStudent[k] as any)[r.status]++;
    });
    return Object.values(byStudent);
  }, [rows]);

  const exportCSV = () => {
    const headers = ["Date","Student ID","Student","Course","Year","Section","Class","Subject","Status"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      lines.push([
        r.date, r.students?.student_id, r.students?.full_name, r.students?.course,
        r.students?.year, r.students?.section, r.classes?.name ?? "", r.classes?.subject ?? "", r.status,
      ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-${from}-to-${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance Report</title>
      <style>body{font-family:sans-serif;padding:24px}h1{color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:12px}th{background:#f3f4f6}</style></head>
      <body><h1>Attendance Report</h1><p>${from} to ${to}</p>
      <table><thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Status</th></tr></thead><tbody>
      ${rows.map((r: any) => `<tr><td>${r.date}</td><td>${r.students?.full_name ?? ""}</td><td>${r.classes?.name ?? ""}</td><td>${r.status}</td></tr>`).join("")}
      </tbody></table><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Filter, view, and export attendance reports</p>
      </div>
      <Card>
        <CardHeader>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={exportCSV}><Download /> CSV</Button>
              <Button variant="outline" onClick={exportHTML}><FileText /> PDF</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student-wise Summary</CardTitle>
          <CardDescription>Aggregated over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Student ID</TableHead><TableHead>Name</TableHead>
              <TableHead>Present</TableHead><TableHead>Late</TableHead><TableHead>Absent</TableHead>
              <TableHead>Attendance %</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {summary.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data.</TableCell></TableRow>
              ) : summary.map(s => {
                const pct = s.total ? Math.round(((s.present + s.late * 0.5) / s.total) * 100) : 0;
                return (
                  <TableRow key={s.sid}>
                    <TableCell className="font-mono text-xs">{s.sid}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.present}</TableCell>
                    <TableCell>{s.late}</TableCell>
                    <TableCell>{s.absent}</TableCell>
                    <TableCell><span className={pct >= 75 ? "text-success font-semibold" : "text-destructive font-semibold"}>{pct}%</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detailed Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.students?.full_name}</TableCell>
                  <TableCell>{r.classes?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
