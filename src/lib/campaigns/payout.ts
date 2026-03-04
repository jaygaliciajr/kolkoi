export type MilestoneTemplate = {
  label: string;
  percent: number;
  trigger: string;
};

export function normalizeMilestoneTemplates(templates: MilestoneTemplate[]) {
  if (templates.length === 0) {
    return [
      { label: "Approved", percent: 40, trigger: "approved" },
      { label: "Verified", percent: 60, trigger: "verified" },
    ];
  }

  const total = templates.reduce((sum, item) => sum + item.percent, 0);
  if (total <= 0) {
    return [
      { label: "Approved", percent: 40, trigger: "approved" },
      { label: "Verified", percent: 60, trigger: "verified" },
    ];
  }

  return templates.map((item) => ({
    ...item,
    percent: (item.percent / total) * 100,
  }));
}

export function calculateMilestoneAmounts(totalPayout: number, percents: number[]) {
  const safeTotal = Number.isFinite(totalPayout) ? Math.max(0, totalPayout) : 0;
  const amounts = percents.map((percent) =>
    Number(((safeTotal * percent) / 100).toFixed(2)),
  );

  const sum = amounts.reduce((acc, value) => acc + value, 0);
  const diff = Number((safeTotal - sum).toFixed(2));
  if (amounts.length > 0 && diff !== 0) {
    amounts[amounts.length - 1] = Number((amounts[amounts.length - 1] + diff).toFixed(2));
  }

  return amounts;
}
