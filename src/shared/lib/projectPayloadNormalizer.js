export function normalizeStatsItem(item = {}) {
  const itemCode = item.item_code || item.itemCode || "STATS_DASHBOARD";
  const quantity = Number(item.quantity ?? 1);
  const baseMd = Number(item.baseMd ?? 0);

  return {
    item_code: itemCode,
    itemCode,
    name: item.name || "통계 항목",
    quantity: Number.isFinite(quantity) ? quantity : 1,
    is_realtime: Boolean(item.is_realtime),
    use_export: Boolean(item.use_export),
    baseMd: Number.isFinite(baseMd) ? baseMd : 0,
    note: item.note || "",
  };
}

export function normalizeItemsBySolution(itemsBySolution = {}) {
  return {
    ...itemsBySolution,
    stats: (itemsBySolution.stats || []).map(normalizeStatsItem),
  };
}
