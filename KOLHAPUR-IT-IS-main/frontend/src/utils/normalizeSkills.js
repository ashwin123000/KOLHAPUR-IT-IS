export function normalizeSkillWeights(skills = []) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return [];
  }

  const total = skills.reduce((sum, skill) => sum + Number(skill.weight || 0), 0);
  if (!total) {
    return skills.map((skill) => ({
      ...skill,
      normalizedWeight: 0,
      displayPercent: 0,
    }));
  }

  return skills.map((skill) => ({
    ...skill,
    normalizedWeight: Number((Number(skill.weight || 0) / total).toFixed(3)),
    displayPercent: Math.round((Number(skill.weight || 0) / total) * 100),
  }));
}

export function getSkillColor(skill) {
  if (skill?.isMustHave) {
    return "#ef4444";
  }
  if ((skill?.displayPercent || 0) >= 20) {
    return "#f59e0b";
  }
  return "#22c55e";
}

export function isMetricMeasurable(metric = "") {
  return /[%<>\d]/.test(metric) || /\b(yes|no|binary|shipped|deployed|complete)\b/i.test(metric);
}
