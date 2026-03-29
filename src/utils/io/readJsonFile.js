export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("파일이 선택되지 않았습니다."));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;

        if (typeof text !== "string") {
          reject(new Error("파일 내용을 읽을 수 없습니다."));
          return;
        }

        const parsed = JSON.parse(text);
        resolve(parsed);
      } catch (error) {
        reject(new Error("JSON 형식이 올바르지 않습니다."));
      }
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    };

    reader.readAsText(file, "utf-8");
  });
}