import React, { useEffect, useMemo, useState } from "react";

import CodebookForm from "../components/CodebookForm";
import CodebookGroupInfoPanel from "../components/CodebookGroupInfoPanel";
import CodebookGroupList from "../components/CodebookGroupList";
import CodebookSearchBar from "../components/CodebookSearchBar";
import CodebookTable from "../components/CodebookTable";
import { useEstimatorStore } from "../../../store/useEstimatorStore";

const TEXT = {
  formClosed:
    "\uCF54\uB4DC\uB97C \uB4F1\uB85D\uD558\uAC70\uB098 \uBAA9\uB85D\uC5D0\uC11C \uC218\uC815\uD560 \uCF54\uB4DC\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
};

function matchesSearch(row, searchText) {
  const keyword = searchText.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return [
    row.group_code,
    row.code,
    row.code_name,
    row.code_value,
    row.description,
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

function buildGroupSummaries(rows) {
  const summaryMap = rows.reduce((result, row) => {
    const groupCode = row.group_code || "UNKNOWN";

    if (!result[groupCode]) {
      result[groupCode] = {
        groupCode,
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        minSortOrder: null,
        maxSortOrder: null,
      };
    }

    const summary = result[groupCode];
    const sortOrder = Number(row.sort_order ?? 0);

    summary.totalCount += 1;
    summary.activeCount += row.is_active ? 1 : 0;
    summary.inactiveCount += row.is_active ? 0 : 1;
    summary.minSortOrder =
      summary.minSortOrder == null
        ? sortOrder
        : Math.min(summary.minSortOrder, sortOrder);
    summary.maxSortOrder =
      summary.maxSortOrder == null
        ? sortOrder
        : Math.max(summary.maxSortOrder, sortOrder);

    return result;
  }, {});

  return Object.values(summaryMap).sort((a, b) =>
    a.groupCode.localeCompare(b.groupCode)
  );
}

export default function CodebookPage() {
  const [selectedGroupCode, setSelectedGroupCode] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [editingRow, setEditingRow] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const rows = useEstimatorStore((state) => state.codebookRows);
  const isBusy = useEstimatorStore((state) => state.isCodebookRowsBusy);
  const isSaving = useEstimatorStore((state) => state.isCodebookSaving);
  const errorMessage = useEstimatorStore((state) => state.lastCodebookRowsError);
  const refreshCodebookRows = useEstimatorStore(
    (state) => state.refreshCodebookRows
  );
  const createCodebookRow = useEstimatorStore(
    (state) => state.createCodebookRow
  );
  const updateCodebookRow = useEstimatorStore(
    (state) => state.updateCodebookRow
  );
  const setCodebookRowActive = useEstimatorStore(
    (state) => state.setCodebookRowActive
  );

  useEffect(() => {
    refreshCodebookRows();
  }, [refreshCodebookRows]);

  const searchedRows = useMemo(() => {
    return rows.filter(
      (row) =>
        matchesSearch(row, searchText) && matchesActiveFilter(row, activeFilter)
    );
  }, [rows, searchText, activeFilter]);

  const groupSummaries = useMemo(() => {
    return buildGroupSummaries(searchedRows);
  }, [searchedRows]);

  useEffect(() => {
    if (selectedGroupCode) {
      const hasSelectedGroup = groupSummaries.some(
        (group) => group.groupCode === selectedGroupCode
      );

      if (hasSelectedGroup) {
        return;
      }
    }

    setSelectedGroupCode(groupSummaries[0]?.groupCode || "");
  }, [groupSummaries, selectedGroupCode]);

  const selectedGroupSummary = useMemo(() => {
    return (
      groupSummaries.find((group) => group.groupCode === selectedGroupCode) ||
      null
    );
  }, [groupSummaries, selectedGroupCode]);

  const selectedGroupRows = useMemo(() => {
    if (!selectedGroupCode) {
      return [];
    }

    return searchedRows.filter((row) => row.group_code === selectedGroupCode);
  }, [searchedRows, selectedGroupCode]);

  const openCreateForm = () => {
    setEditingRow(
      selectedGroupCode
        ? {
            group_code: selectedGroupCode,
            is_active: true,
          }
        : null
    );
    setIsFormOpen(true);
  };

  const openEditForm = (row) => {
    setEditingRow(row);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingRow(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (payload) => {
    const result = editingRow?.id
      ? await updateCodebookRow(editingRow.id, payload)
      : await createCodebookRow(payload);

    if (result) {
      closeForm();
    }

    return result;
  };

  const handleToggleActive = async (row, nextIsActive) => {
    await setCodebookRowActive(row.id, nextIsActive);
  };

  return (
    <div className="mx-auto max-w-[1360px] space-y-4 p-4">
      <CodebookSearchBar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        onRefresh={refreshCodebookRows}
        onCreateCode={openCreateForm}
        isBusy={isBusy}
        isSaving={isSaving}
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CodebookGroupList
          groups={groupSummaries}
          selectedGroupCode={selectedGroupCode}
          onSelectGroup={setSelectedGroupCode}
          isBusy={isBusy}
        />

        <CodebookTable
          rows={selectedGroupRows}
          isBusy={isBusy}
          isSaving={isSaving}
          selectedRowId={editingRow?.id || null}
          onEdit={openEditForm}
          onToggleActive={handleToggleActive}
          showGroupCode={false}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CodebookGroupInfoPanel groupSummary={selectedGroupSummary} />

        <div className="min-w-0">
          {isFormOpen ? (
            <CodebookForm
              key={editingRow?.id || editingRow?.group_code || "create"}
              initialValue={editingRow}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
              {TEXT.formClosed}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
