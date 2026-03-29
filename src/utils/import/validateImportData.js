export function validateImportData(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      message: "가져온 데이터가 객체 형식이 아닙니다.",
    };
  }

  const project = data.project;

  if (!project || typeof project !== "object") {
    return {
      valid: false,
      message: "project 영역이 없습니다.",
    };
  }

  if (
    !project.itemsBySolution ||
    typeof project.itemsBySolution !== "object"
  ) {
    return {
      valid: false,
      message: "itemsBySolution 형식이 올바르지 않습니다.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}