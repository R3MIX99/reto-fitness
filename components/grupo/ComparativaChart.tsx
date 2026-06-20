"use client";

import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyScoreEntry } from "@/lib/hooks/useGroups";

const COLORS = ["#CF5C36", "#EFC88B", "#EEE5E9", "#7C7C7C", "#5f5a52", "#6aaa96", "#a084ca"];

interface ComparativaChartProps {
  data: DailyScoreEntry[];
  leaderUserId?: string;
}

function buildChartData(data: DailyScoreEntry[], leaderUserId?: string) {
  // Get last 7 dates
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }

  // Get unique users, leader first
  const allUsers = Array.from(new Set(data.map((r) => r.user_id)));
  const users = leaderUserId
    ? [leaderUserId, ...allUsers.filter((u) => u !== leaderUserId)]
    : allUsers;

  const userNames: Record<string, string> = {};
  data.forEach((r) => { userNames[r.user_id] = r.full_name?.split(" ")[0] ?? "?"; });

  // Build chart rows per date
  const rows = dates.map((date) => {
    const row: Record<string, string | number> = { date: date.slice(5) }; // MM-DD
    users.forEach((uid) => {
      const match = data.find((r) => r.user_id === uid && r.score_date === date);
      row[userNames[uid] ?? uid] = match?.total_points ?? 0;
    });
    return row;
  });

  const userList = users.map((uid, i) => ({
    uid,
    name: userNames[uid] ?? uid,
    color: i === 0 && uid === leaderUserId ? "#CF5C36" : COLORS[i % COLORS.length],
    isLeader: uid === leaderUserId,
  }));

  return { rows, userList };
}

function formatDate(str: string) {
  const [m, d] = str.split("-");
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const date = new Date();
  date.setMonth(parseInt(m) - 1);
  date.setDate(parseInt(d));
  const today = new Date();
  if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth()) return "Hoy";
  return `${days[date.getDay()]} ${parseInt(d)}`;
}

export function ComparativaChart({ data, leaderUserId }: ComparativaChartProps) {
  if (!data.length) return null;

  const { rows, userList } = buildChartData(data, leaderUserId);

  return (
    <div>
      <div className="flex items-center gap-2 mt-5 mb-3">
        <TrendingUp size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[14px] font-medium">Comparativa</span>
        <span className="text-[11px] text-[var(--color-muted)]">· últimos 7 días</span>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-[16px] p-3 pb-2">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#7C7C7C", fontSize: 8.5 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 11]}
              ticks={[0, 5.5, 11]}
              tick={{ fill: "#7C7C7C", fontSize: 8 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#141414", border: "none", borderRadius: 10, fontSize: 11 }}
              labelStyle={{ color: "#7C7C7C" }}
              itemStyle={{ color: "#EEE5E9" }}
            />
            {userList.map((u) => (
              <Line
                key={u.uid}
                type="monotone"
                dataKey={u.name}
                stroke={u.color}
                strokeWidth={u.isLeader ? 2.5 : 2}
                dot={{ r: u.isLeader ? 2.4 : 1.8, fill: u.color, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
            <Legend
              iconType="circle"
              iconSize={9}
              wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
