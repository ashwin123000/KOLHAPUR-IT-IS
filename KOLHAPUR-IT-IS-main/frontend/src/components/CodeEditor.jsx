import Editor from "@monaco-editor/react";

const languageMap = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
};

export default function CodeEditor({ language, value, onChange, readOnly = false }) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-slate-800">
      <Editor
        height="100%"
        language={languageMap[language] || "plaintext"}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          padding: { top: 16 },
          readOnly,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
        }}
      />
    </div>
  );
}
