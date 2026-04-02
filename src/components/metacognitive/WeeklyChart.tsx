import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; successes: number; lapses: number; total: number }[];
}

export default function WeeklyChart({ data }: Props) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-medium mb-4">Sedmični pregled</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
          <Bar dataKey="successes" name="Uspjesi" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="lapses" name="Lapsusi" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
