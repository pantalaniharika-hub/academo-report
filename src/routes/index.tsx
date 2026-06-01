import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, BarChart3, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold tracking-tight">EduTrack</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild><Link to="/signup">Get started</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
          Modern Attendance Management for <span className="text-primary">Educational Institutions</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Track student attendance, manage faculty, and generate reports — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/signup">Create account</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">Sign in</Link></Button>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { Icon: Users, title: "Student & Faculty Management", body: "Full CRUD for student and faculty records with role-based access." },
            { Icon: BarChart3, title: "Real-time Dashboards", body: "Attendance percentages, absent counts, and trends at a glance." },
            { Icon: ShieldCheck, title: "Secure by default", body: "Row-level security ensures users only see what they should." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6 text-left shadow-sm">
              <Icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
