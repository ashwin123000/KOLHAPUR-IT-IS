import React from "react";

import AriaChatbot from "./AriaChatbot";

export default function GlobalAIChatbot() {
  return (
    <AriaChatbot
      storageKey="aria-global-chat"
      title="ARIA"
      subtitle="Adaptive Role Intelligence Assistant"
      variant="global"
    />
  );
}
