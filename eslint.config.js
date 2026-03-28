import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import { readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Collect all .tsx component files from ui_components at lint-time
function getUiComponentNames() {
  try {
    const dir = resolve(__dirname, "src/client-web/src/ui_components");
    return readdirSync(dir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(".tsx", ""));
  } catch {
    return [];
  }
}

const uiComponentNames = getUiComponentNames();

// Custom rule: every file in ui_components/ must be imported in UIComponentsPage.tsx
const uiComponentsCoverageRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce that all UI components in ui_components/ are imported in UIComponentsPage.tsx",
    },
    schema: [],
    messages: {
      missingImport:
        'UI component "{{name}}" from ui_components/ must be imported in UIComponentsPage.tsx. Add it and showcase its variations.',
    },
  },
  create(context) {
    const importedSources = new Set();

    return {
      ImportDeclaration(node) {
        importedSources.add(node.source.value);
      },
      "Program:exit"(node) {
        for (const name of uiComponentNames) {
          const imported = [...importedSources].some((src) =>
            src.includes(`ui_components/${name}`) || src.includes(`ui_components/index`)
          );
          if (!imported) {
            context.report({
              node,
              messageId: "missingImport",
              data: { name },
            });
          }
        }
      },
    };
  },
};

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Enforce that UIComponentsPage imports every component from ui_components/
  {
    files: ["**/UIComponentsPage.tsx"],
    plugins: {
      local: {
        rules: {
          "ui-components-coverage": uiComponentsCoverageRule,
        },
      },
    },
    rules: {
      "local/ui-components-coverage": "error",
    },
  },
]);
