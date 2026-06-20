import React, { useEffect, useMemo, useState } from "react";

import CodebookForm from "../components/CodebookForm";
import CodebookGroupInfoPanel from "../components/CodebookGroupInfoPanel";
import CodebookGroupList from "../components/CodebookGroupList";
import CodebookSearchBar from "../components/CodebookSearchBar";
import CodebookTable from "../components/CodebookTable";
import { useEstimatorStore } from "../../../store/useEstimatorStore";

const TEXT = {
  emptyRows:
    "등록된 코드가 없습니다. 하단 코드 상세에서 신규 코드를 입력하세요.",
  createSuccess: "코드 등록이 완료되었습니다.",
  createFailure: "코드 등록에 실패했습니다.",
  saveSuccess: "코드 수정이 완료되었습니다.",
  saveFailure: "코드 수정에 실패했습니다.",
  activeSuccess: "코드 상태 변경이 완료되었습니다.",
  activeFailure: "코드 상태 변경에 실패했습니다.",
  loadFailure: "코드북을 불러오지 못했습니다.",
  groupRequired: "코드유형아이디와 코드유형명은 필수입니다.",
  groupSaveSuccess: "코드유형 정보를 저장했습니다.",
  groupSaveFailure: "코드유형 정보 저장에 실패했습니다.",
  reservedCode: "코드 00은 코드유형 정보 저장용 예약값입니다.",
  noFilteredRows: "조회 조건에 맞는 코드가 없습니다.",
};

const ALL_GROUP_CODE = "ALL";
const CODE_TYPE_METADATA_CODE = "00";
const DEFAULT_FILTERS = {
  groupCode: ALL_GROUP_CODE,
  searchField: "code",
  searchText: "",
  activeFilter: "ALL",
};
const ALL_GROUP_SENTINELS = new Set([
  "",
  "ALL",
  "all",
  "전체",
  "__ALL__",
]);
const EMPTY_GROUP_DRAFT = {
  metadata_row_id: null,
  group_code: "",
  group_name: "",
  description: "",
  code_change_enabled: "Y",
  is_active: true,
};

function buildEmptyGroupDraft() {
  return { ...EMPTY_GROUP_DRAFT };
}

function buildEmptyCodeRow(groupCode = "") {
  return {
    group_code: groupCode && groupCode !== ALL_GROUP_CODE ? groupCode : "",
    code: "",
    code_name: "",
    code_value: "",
    description: "",
    sort_order: 0,
    is_active: true,
  };
}

function buildGroupDraft(groupSummary) {
  if (!groupSummary) {
    return buildEmptyGroupDraft();
  }

  return {
    metadata_row_id: groupSummary.metadataRowId || null,
    group_code: groupSummary.groupCode || "",
    group_name: groupSummary.typeName || groupSummary.groupCode || "",
    description: groupSummary.description || "",
    code_change_enabled: "Y",
    is_active: groupSummary.isActive !== false,
  };
}

function isCodeTypeMetadataRow(row) {
  return String(row?.code || "").trim() === CODE_TYPE_METADATA_CODE;
}

function matchesSearch(row, filters) {
  const keyword = filters.searchText.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  const value = row[filters.searchField];

  return String(value || "").toLowerCase().includes(keyword);
}

function matchesQueryFilters(row, filters) {
  const isAllGroup = ALL_GROUP_SENTINELS.has(String(filters.groupCode ?? ""));

  if (!isAllGroup && row.group_code !== filters.groupCode) {
    return false;
  }

  return matchesSearch(row, filters);
}

function matchesActiveFilter(isActive, filters) {
  if (filters.activeFilter === "ACTIVE") {
    return isActive === true;
  }

  if (filters.activeFilter === "INACTIVE") {
    return isActive === false;
  }

  return true;
}

function buildGroupSummaries(rows) {
  const summaryMap = rows.reduce((result, row) => {
    const groupCode = row.group_code || "UNKNOWN";

    if (!result[groupCode]) {
      result[groupCode] = {
        groupCode,
        typeName: groupCode,
        description: "",
        isActive: true,
        metadataRowId: null,
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        minSortOrder: null,
        maxSortOrder: null,
      };
    }

    const summary = result[groupCode];
    const sortOrder = Number(row.sort_order ?? 0);

    if (isCodeTypeMetadataRow(row)) {
      summary.typeName = row.code_name || groupCode;
      summary.description = row.description || "";
      summary.isActive = row.is_active !== false;
      summary.metadataRowId = row.id || null;
      return result;
    }

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
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedGroupCode, setSelectedGroupCode] = useState("");
  const [groupDraft, setGroupDraft] = useState(() => buildEmptyGroupDraft());
  const [groupDetailMode, setGroupDetailMode] = useState("create");
  const [codeDetailRow, setCodeDetailRow] = useState(() => buildEmptyCodeRow());
  const [statusMessage, setStatusMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");

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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => matchesQueryFilters(row, filters));
  }, [rows, filters]);

  const groupSummaries = useMemo(() => {
    return buildGroupSummaries(filteredRows).filter((group) =>
      matchesActiveFilter(group.isActive !== false, filters)
    );
  }, [filteredRows, filters]);

  const selectedGroupSummary = useMemo(() => {
    return (
      groupSummaries.find((group) => group.groupCode === selectedGroupCode) ||
      null
    );
  }, [groupSummaries, selectedGroupCode]);

  useEffect(() => {
    if (selectedGroupSummary) {
      setGroupDraft(buildGroupDraft(selectedGroupSummary));
      setGroupDetailMode("edit");
      return;
    }

    if (!selectedGroupCode) {
      setGroupDraft(buildEmptyGroupDraft());
      setGroupDetailMode("create");
    }
  }, [selectedGroupCode, selectedGroupSummary]);

  const groupCodeOptions = useMemo(() => {
    const values = rows
      .map((row) => row.group_code)
      .filter(Boolean)
      .map((value) => String(value));

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const selectedGroupRows = useMemo(() => {
    const codeRows = filteredRows.filter(
      (row) =>
        !isCodeTypeMetadataRow(row) &&
        matchesActiveFilter(row.is_active === true, filters)
    );

    if (!selectedGroupCode) {
      return codeRows;
    }

    return codeRows.filter((row) => row.group_code === selectedGroupCode);
  }, [filteredRows, filters, selectedGroupCode]);

  const applyFilters = (nextFilters) => {
    const isAllGroup = ALL_GROUP_SENTINELS.has(
      String(nextFilters.groupCode ?? "")
    );
    const normalizedFilters = {
      ...nextFilters,
      groupCode: isAllGroup ? ALL_GROUP_CODE : nextFilters.groupCode,
    };

    setFilters(normalizedFilters);
    setCodeDetailRow(buildEmptyCodeRow());
    setStatusMessage("");
    setActionErrorMessage("");
    setSelectedGroupCode(isAllGroup ? "" : nextFilters.groupCode);
    setGroupDetailMode(isAllGroup ? "create" : "edit");
  };

  const resetFilters = () => {
    applyFilters(DEFAULT_FILTERS);
  };

  const openEditForm = (row) => {
    setStatusMessage("");
    setActionErrorMessage("");
    setCodeDetailRow(row);
  };

  const resolveNewCodeGroupCode = (preferredGroupCode = selectedGroupCode) => {
    const selectedCode = String(preferredGroupCode || "").trim();

    if (selectedCode && selectedCode !== ALL_GROUP_CODE) {
      return selectedCode;
    }

    return String(groupDraft.group_code || "").trim();
  };

  const openCreateCodeForm = (preferredGroupCode = selectedGroupCode) => {
    setStatusMessage("");
    setActionErrorMessage("");
    setCodeDetailRow(buildEmptyCodeRow(resolveNewCodeGroupCode(preferredGroupCode)));
  };

  const openCreateGroupForm = () => {
    setStatusMessage("");
    setActionErrorMessage("");
    setSelectedGroupCode("");
    setGroupDetailMode("create");
    setGroupDraft(buildEmptyGroupDraft());
    setCodeDetailRow(buildEmptyCodeRow());
  };

  const handleGroupDraftChange = (nextDraft) => {
    setGroupDraft(nextDraft);

    if (codeDetailRow?.id) {
      return;
    }

    setCodeDetailRow((previousRow) => ({
      ...buildEmptyCodeRow(),
      ...(previousRow || {}),
      group_code: String(nextDraft.group_code || "").trim(),
    }));
  };

  const buildCodeTypePayload = (metadataRow = null) => {
    const nextGroupCode = String(groupDraft.group_code || "").trim();
    const nextGroupName = String(groupDraft.group_name || "").trim();

    if (!nextGroupCode || !nextGroupName) {
      return {
        error: TEXT.groupRequired,
        payload: null,
      };
    }

    return {
      error: "",
      payload: {
        group_code: nextGroupCode,
        code: CODE_TYPE_METADATA_CODE,
        code_name: nextGroupName,
        code_value: CODE_TYPE_METADATA_CODE,
        description: metadataRow ? metadataRow.description || null : null,
        sort_order: metadataRow ? metadataRow.sort_order ?? 0 : 0,
        is_active: groupDraft.is_active !== false,
      },
    };
  };

  const findMetadataRow = (groupCode) =>
    rows.find(
      (row) => row.group_code === groupCode && isCodeTypeMetadataRow(row)
    ) || null;

  const saveGroupDraft = async () => {
    const draftGroupCode = String(groupDraft.group_code || "").trim();
    const metadataRow =
      (groupDraft.metadata_row_id &&
        rows.find((row) => row.id === groupDraft.metadata_row_id)) ||
      findMetadataRow(draftGroupCode);
    const { error, payload } = buildCodeTypePayload(metadataRow);

    setStatusMessage("");
    if (error) {
      setActionErrorMessage(error);
      return false;
    }

    const result = metadataRow
      ? await updateCodebookRow(metadataRow.id, payload)
      : await createCodebookRow(payload);

    if (!result) {
      setActionErrorMessage(TEXT.groupSaveFailure);
      return false;
    }

    setActionErrorMessage("");
    setSelectedGroupCode(payload.group_code);
    setGroupDetailMode("edit");
    setGroupDraft({
      ...groupDraft,
      metadata_row_id: metadataRow?.id || groupDraft.metadata_row_id || null,
      group_code: payload.group_code,
      group_name: payload.code_name,
      description: payload.description || "",
      is_active: payload.is_active,
    });
    setCodeDetailRow(buildEmptyCodeRow(payload.group_code));
    setStatusMessage(TEXT.groupSaveSuccess);
    return true;
  };

  const handleSelectGroup = (groupCode) => {
    setStatusMessage("");
    setActionErrorMessage("");
    setSelectedGroupCode(groupCode);
    setGroupDetailMode("edit");
    setCodeDetailRow(buildEmptyCodeRow(groupCode));
  };

  const handleSubmit = async (payload) => {
    if (
      !codeDetailRow?.id &&
      String(payload.code || "").trim() === CODE_TYPE_METADATA_CODE
    ) {
      setStatusMessage("");
      setActionErrorMessage(TEXT.reservedCode);
      return false;
    }

    if (!codeDetailRow?.id) {
      const result = await createCodebookRow(payload);

      if (result) {
        setSelectedGroupCode(payload.group_code || "");
        setGroupDetailMode("edit");
        setCodeDetailRow(buildEmptyCodeRow(payload.group_code));
        setStatusMessage(TEXT.createSuccess);
        setActionErrorMessage("");
      } else {
        setActionErrorMessage(TEXT.createFailure);
      }

      return result;
    }

    const result = await updateCodebookRow(codeDetailRow.id, payload);

    if (result) {
      setStatusMessage(TEXT.saveSuccess);
      setActionErrorMessage("");
      setCodeDetailRow(buildEmptyCodeRow(payload.group_code));
    } else {
      setActionErrorMessage(TEXT.saveFailure);
    }

    return result;
  };

  const handleToggleActive = async (row, nextIsActive) => {
    setStatusMessage("");
    setActionErrorMessage("");
    const result = await setCodebookRowActive(row.id, nextIsActive);

    if (result) {
      setStatusMessage(TEXT.activeSuccess);
    } else {
      setActionErrorMessage(TEXT.activeFailure);
    }

    return result;
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-3 p-3">
      <CodebookSearchBar
        groupCodeOptions={groupCodeOptions}
        filters={filters}
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        onRefresh={refreshCodebookRows}
        isBusy={isBusy}
        isSaving={isSaving}
      />

      {(errorMessage || actionErrorMessage) && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {errorMessage ? TEXT.loadFailure : actionErrorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {statusMessage}
        </div>
      )}

      {!isBusy && !errorMessage && rows.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-600">{TEXT.emptyRows}</p>
        </div>
      )}

      {!isBusy && rows.length > 0 && filteredRows.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-sm">
          {TEXT.noFilteredRows}
        </div>
      )}

      {!errorMessage && (
        <>
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
            <CodebookGroupList
              groups={groupSummaries}
              selectedGroupCode={selectedGroupCode}
              onSelectGroup={handleSelectGroup}
              isBusy={isBusy}
            />

            <CodebookTable
              rows={selectedGroupRows}
              isBusy={isBusy}
              isSaving={isSaving}
              selectedRowId={codeDetailRow?.id || null}
              onEdit={openEditForm}
              onToggleActive={handleToggleActive}
            />
          </div>

          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
            <CodebookGroupInfoPanel
              draft={groupDraft}
              mode={groupDetailMode}
              isSaving={isSaving}
              onChange={handleGroupDraftChange}
              onPrepareCreate={openCreateGroupForm}
              onSave={saveGroupDraft}
            />

            <CodebookForm
              key={`${codeDetailRow?.id || "create"}:${
                codeDetailRow?.group_code || ""
              }`}
              initialValue={codeDetailRow}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              onPrepareCreate={() => openCreateCodeForm(selectedGroupCode)}
              groupCodeOptions={groupCodeOptions}
              reservedCode={CODE_TYPE_METADATA_CODE}
              reservedCodeMessage={TEXT.reservedCode}
            />
          </div>
        </>
      )}
    </div>
  );
}
