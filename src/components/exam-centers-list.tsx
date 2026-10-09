"use client";

import { useMemo, useState } from "react";
import { EXAM_CENTERS } from "@/data/exam-centers";
import { RWANDA_PROVINCES } from "@/lib/site-config";

export function ExamCentersList() {
  const [province, setProvince] = useState<string>("all");

  const filtered = useMemo(
    () =>
      province === "all"
        ? EXAM_CENTERS
        : EXAM_CENTERS.filter((c) => c.province === province),
    [province],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="province" className="text-sm font-semibold">
          Filter by province:
        </label>
        <select
          id="province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All provinces</option>
          {RWANDA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Center</th>
              <th className="px-4 py-3 font-semibold">Province</th>
              <th className="px-4 py-3 font-semibold">District</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((center) => (
              <tr key={center.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{center.name}</td>
                <td className="px-4 py-3">{center.province}</td>
                <td className="px-4 py-3">{center.district}</td>
                <td className="px-4 py-3">{center.capacity}</td>
                <td className="px-4 py-3 text-muted-foreground">{center.contactEmail}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No exam centers found for this province yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
