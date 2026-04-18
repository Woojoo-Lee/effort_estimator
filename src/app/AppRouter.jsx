import React from "react";

import CodebookPage from "../features/codebooks/pages/CodebookPage";
import EstimatorPage from "../features/estimator/pages/EstimatorPage";
import ItemMetaPage from "../features/itemMeta/pages/ItemMetaPage";
import ProjectPage from "../features/projects/pages/ProjectPage";

export default function AppRouter({ route }) {
  switch (route) {
    case "/codebooks":
      return <CodebookPage />;
    case "/item-meta":
      return <ItemMetaPage />;
    case "/projects":
      return <ProjectPage />;
    case "/estimator":
    default:
      return <EstimatorPage />;
  }
}
