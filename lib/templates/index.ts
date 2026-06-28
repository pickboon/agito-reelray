import revenge from "./revenge.json";
import romance from "./romance.json";
import thriller from "./thriller.json";
import fantasy from "./fantasy.json";

export interface CharacterBlueprint {
  role: string;
  name: string;
  description: string;
  prompt_template: string;
}

export interface ScenePreset {
  name: string;
  prompt: string;
}

export interface ColorPreset {
  name: string;
  description: string;
  temperature: string;
  contrast: string;
  saturation: string;
}

export interface ShotRhythmTemplate {
  pacing: string;
  avg_shot_duration: number;
  style_notes: string;
}

export interface Template {
  id: string;
  name: string;
  genre: "revenge" | "romance" | "thriller" | "fantasy";
  description: string;
  target_markets: string[];
  character_blueprints: CharacterBlueprint[];
  scene_library: ScenePreset[];
  color_grade: ColorPreset;
  shot_rhythm: ShotRhythmTemplate;
  prompt_templates: Record<string, string>;
}

const templates: Record<string, Template> = {
  revenge: revenge as Template,
  romance: romance as Template,
  thriller: thriller as Template,
  fantasy: fantasy as Template,
};

export function getTemplate(id: string): Template | undefined {
  return templates[id];
}

export function getAllTemplates(): Template[] {
  return Object.values(templates);
}

export function getTemplateIds(): string[] {
  return Object.keys(templates);
}
