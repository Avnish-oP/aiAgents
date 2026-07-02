"use client";

import { PersonaConfig, PersonaId } from "@/types";
import { personas } from "@/lib/personas";

interface PersonaSwitcherProps {
  activePersona: PersonaId;
  onSwitch: (id: PersonaId) => void;
}

export default function PersonaSwitcher({
  activePersona,
  onSwitch,
}: PersonaSwitcherProps) {
  const personaList = Object.values(personas) as PersonaConfig[];

  return (
    <div className="persona-switcher">
      {personaList.map((persona) => {
        const isActive = persona.id === activePersona;
        return (
          <button
            key={persona.id}
            className={`persona-card ${isActive ? "active" : ""}`}
            onClick={() => onSwitch(persona.id)}
            style={
              {
                "--persona-primary": persona.colorTheme.primary,
                "--persona-glow": persona.colorTheme.primaryGlow,
              } as React.CSSProperties
            }
          >
            <div className="persona-card-inner">
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="persona-avatar"
                width={48}
                height={48}
              />
              <div className="persona-info">
                <span className="persona-name">{persona.name}</span>
                <span className="persona-desc">{persona.description}</span>
              </div>
            </div>
            {isActive && <div className="persona-active-dot" />}
          </button>
        );
      })}
    </div>
  );
}
