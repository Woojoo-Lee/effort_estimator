import React, { useEffect, useMemo, useState } from "react";

import ItemMetaDetailPanel from "../components/ItemMetaDetailPanel";
import ItemMetaSearchBar from "../components/ItemMetaSearchBar";
import ItemMetaSolutionInfoPanel from "../components/ItemMetaSolutionInfoPanel";
import ItemMetaSolutionList from "../components/ItemMetaSolutionList";
import ItemMetaTable from "../components/ItemMetaTable";
import { useEstimatorStore } from "../../../store/useEstimatorStore";

const UNKNOWN_SOLUTION_CODE = "UNKNOWN";

function getSolutionCode(row) {
  return row.solution_code || UNKNOWN_SOLUTION_CODE;
}

function matchesSearch(row, searchText) {
  const keyword = searchText.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return [
    row.solution_code,
    row.item_code,
    row.item_name,
    row.description,
    row.default_note,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function matchesActiveFilter(row, activeFilter) {
  if (activeFilter === "ACTIVE") {
    return row.is_active === true;
  }

  if (activeFilter === "INACTIVE") {
    return row.is_active === false;
  }

  return true;
}

function buildSolutionSummaries(rows) {
  const summaryMap = rows.reduce((result, row) => {
    const solutionCode = getSolutionCode(row);

    if (!result[solutionCode]) {
      result[solutionCode] = {
        solutionCode,
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        baseMdTotal: 0,
      };
    }

    const summary = result[solutionCode];
    const baseMd = Number(row.default_base_md ?? 0);

    summary.totalCount += 1;
    summary.activeCount += row.is_active ? 1 : 0;
    summary.inactiveCount += row.is_active ? 0 : 1;
    summary.baseMdTotal += Number.isFinite(baseMd) ? baseMd : 0;

    return result;
  }, {});

  return Object.values(summaryMap).sort((a, b) =>
    a.solutionCode.localeCompare(b.solutionCode)
  );
}

export default function ItemMetaPage() {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedSolutionCode, setSelectedSolutionCode] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);

  const rows = useEstimatorStore((state) => state.itemMetaRows);
  const isBusy = useEstimatorStore((state) => state.isItemMetaRowsBusy);
  const errorMessage = useEstimatorStore(
    (state) => state.lastItemMetaRowsError
  );
  const refreshItemMetaRows = useEstimatorStore(
    (state) => state.refreshItemMetaRows
  );

  useEffect(() => {
    refreshItemMetaRows();
  }, [refreshItemMetaRows]);

  const searchedRows = useMemo(() => {
    return rows.filter(
      (row) =>
        matchesSearch(row, searchText) && matchesActiveFilter(row, activeFilter)
    );
  }, [rows, searchText, activeFilter]);

  const solutionSummaries = useMemo(() => {
    return buildSolutionSummaries(searchedRows);
  }, [searchedRows]);

  useEffect(() => {
    if (selectedSolutionCode) {
      const hasSelectedSolution = solutionSummaries.some(
        (solution) => solution.solutionCode === selectedSolutionCode
      );

      if (hasSelectedSolution) {
        return;
      }
    }

    setSelectedSolutionCode(solutionSummaries[0]?.solutionCode || "");
  }, [solutionSummaries, selectedSolutionCode]);

  const selectedSolutionSummary = useMemo(() => {
    return (
      solutionSummaries.find(
        (solution) => solution.solutionCode === selectedSolutionCode
      ) || null
    );
  }, [solutionSummaries, selectedSolutionCode]);

  const selectedSolutionRows = useMemo(() => {
    if (!selectedSolutionCode) {
      return [];
    }

    return searchedRows.filter(
      (row) => getSolutionCode(row) === selectedSolutionCode
    );
  }, [searchedRows, selectedSolutionCode]);

  const selectedItem = useMemo(() => {
    return selectedSolutionRows.find((row) => row.id === selectedItemId) || null;
  }, [selectedSolutionRows, selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const hasSelectedItem = selectedSolutionRows.some(
      (row) => row.id === selectedItemId
    );

    if (!hasSelectedItem) {
      setSelectedItemId(null);
    }
  }, [selectedSolutionRows, selectedItemId]);

  const handleSelectSolution = (solutionCode) => {
    setSelectedSolutionCode(solutionCode);
    setSelectedItemId(null);
  };

  const handleSelectItem = (row) => {
    setSelectedItemId(row.id);
  };

  return (
    <div className="mx-auto max-w-[1360px] space-y-4 p-4">
      <ItemMetaSearchBar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        onRefresh={refreshItemMetaRows}
        isBusy={isBusy}
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ItemMetaSolutionList
          solutions={solutionSummaries}
          selectedSolutionCode={selectedSolutionCode}
          onSelectSolution={handleSelectSolution}
          isBusy={isBusy}
        />

        <ItemMetaTable
          rows={selectedSolutionRows}
          selectedItemId={selectedItemId}
          isBusy={isBusy}
          onSelectItem={handleSelectItem}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ItemMetaSolutionInfoPanel solutionSummary={selectedSolutionSummary} />
        <ItemMetaDetailPanel item={selectedItem} />
      </div>
    </div>
  );
}
