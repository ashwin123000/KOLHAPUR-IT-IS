import React from "react";

import AriaChatbot from "./AriaChatbot";

export default function CareerChatWidget({ jobId, jobTitle }) {
  return (
    <AriaChatbot
      storageKey={`aria-job-chat-${jobId || "general"}`}
      title="ARIA"
      subtitle="Role-Specific Career Diagnosis"
      variant="job"
      jobId={jobId}
      jobTitle={jobTitle}
    />
  );
}
