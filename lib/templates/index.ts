import revenge from "./revenge.json";
import romance from "./romance.json";
import thriller from "./thriller.json";
import fantasy from "./fantasy.json";

export interface TemplateCharacter {
  name: string;
  role: string;
  traits: string;
  appearance: string;
}

export interface TemplateShot {
  shot_number: number;
  prompt: string;
  mode: "t2v";
  duration: number;
}

export interface TemplateScene {
  scene_number: number;
  title: string;
  description: string;
  shots: TemplateShot[];
}

export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: "revenge" | "romance" | "thriller" | "fantasy";
  tags: string[];
  cover_emoji: string;
  total_scenes: number;
  total_shots: number;
  estimated_credits: number;
  characters: TemplateCharacter[];
  emotion_graph: number[];
  scenes: TemplateScene[];
}

const templates: StoreTemplate[] = [
  revenge as unknown as StoreTemplate,
  romance as unknown as StoreTemplate,
  thriller as unknown as StoreTemplate,
  fantasy as unknown as StoreTemplate,
];

export function getTemplate(id: string): StoreTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getAllTemplates(): StoreTemplate[] {
  return templates;
}

export function getTemplatesByCategory(category: string): StoreTemplate[] {
  if (category === "all") return templates;
  return templates.filter((t) => t.category === category);
}

export function getTemplateIds(): string[] {
  return templates.map((t) => t.id);
}
