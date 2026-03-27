export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsText(file, "utf-8");
  });
}

export function downloadJsonFile({ projectName, payload }) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeProjectName = (projectName || "contact-center-project").replace(
    /[\\/:*?"<>|]/g,
    "-"
  );

  link.href = url;
  link.download = `${safeProjectName}-effort-estimate.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}