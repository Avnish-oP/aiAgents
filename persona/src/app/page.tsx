"use client";

import { useState } from "react";
import { PersonaId } from "@/types";
import { getPersonaConfig } from "@/lib/personas";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  const [activePersona, setActivePersona] = useState<PersonaId>("hitesh");
  const persona = getPersonaConfig(activePersona);

  return (
    <div
      className="app-wrapper"
      style={
        {
          "--persona-primary": persona.colorTheme.primary,
          "--persona-glow": persona.colorTheme.primaryGlow,
        } as React.CSSProperties
      }
    >
      <Header persona={persona} />

      <div className="main-content">
        <ChatInterface
          persona={persona}
          activePersona={activePersona}
          onSwitchPersona={setActivePersona}
        />
      </div>
    </div>
  );
}
