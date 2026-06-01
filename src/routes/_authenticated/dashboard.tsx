import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string | number; accent: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { role } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [students, faculty, attendance] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("faculty").select("id", { count: "exact", head: true }),
        supabase.from("attendance").select("status, date").gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
      ]);
      const records = attendance.data ?? [];
      const present = records.filter(r => r.status === "present").length;
      const absent = records.filter(r => r.status === "absent").length;
      const late = records.filter(r => r.status === "late").length;
      const total = records.length || 1;
      const pct = Math.round(((present + late * 0.5) / total) * 100);

      // last 7 days
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
        const dayRecs = records.filter(r => r.date === d);
        return {
          date: format(subDays(new Date(), 6 - i), "MMM dd"),
          present: dayRecs.filter(r => r.status === "present").length,
          absent: dayRecs.filter(r => r.status === "absent").length,
          late: dayRecs.filter(r => r.status === "late").length,
        };
      });

      return {
        totalStudents: students.count ?? 0,
        totalFaculty: faculty.count ?? 0,
        attendancePct: pct,
        absentCount: absent,
        days,
        pie: [
          { name: "Present", value: present },
          { name: "Late", value: late },
          { name: "Absent", value: absent },
        ],
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-attendance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, status, date, students(full_name, student_id)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const COLORS = ["oklch(0.65 0.17 150)", "oklch(0.78 0.16 75)", "oklch(0.58 0.22 27)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview for the last 30 days · <span className="capitalize">{role}</span> view</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={stats?.totalStudents ?? "—"} accent="bg-primary/10 text-primary" />
        <StatCard icon={GraduationCap} label="Total Faculty" value={stats?.totalFaculty ?? "—"} accent="bg-chart-5/10 text-chart-5" />
        <StatCard icon={CheckCircle2} label="Attendance %" value={`${stats?.attendancePct ?? 0}%`} accent="bg-success/10 text-success" />
        <StatCard icon={XCircle} label="Absences (30d)" value={stats?.absentCount ?? 0} accent="bg-destructive/10 text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Last 7 days</CardTitle>
            <CardDescription>Daily attendance breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="present" stackId="a" fill="oklch(0.65 0.17 150)" />
                <Bar dataKey="late" stackId="a" fill="oklch(0.78 0.16 75)" />
                <Bar dataKey="absent" stackId="a" fill="oklch(0.58 0.22 27)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
            <CardDescription>30-day distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.pie ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {(stats?.pie ?? []).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent attendance activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent && recent.length > 0 ? (
            <div className="divide-y">
              {recent.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{r.students?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.students?.student_id} · {r.date}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                    r.status === "present" ? "bg-success/10 text-success" :
                    r.status === "late" ? "bg-warning/10 text-warning-foreground" :
                    "bg-destructive/10 text-destructive"
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
