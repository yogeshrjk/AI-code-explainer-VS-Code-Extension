import * as vscode from "vscode";
import {
  BEHAVIORS,
  GEMINI_VOICES,
  PREFERRED_LANGUAGES,
  type Preferences
} from "./types.js";

function isOneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): value is T {
  return value !== undefined && allowed.some((item) => item === value);
}

export function readPreferences(): Preferences {
  const configuration = vscode.workspace.getConfiguration("liveline");
  const voiceValue = configuration.get<string>("voice");
  const languageValue = configuration.get<string>("preferredLanguage");
  const behaviorValue = configuration.get<string>("behavior");

  return {
    voice: isOneOf(voiceValue, GEMINI_VOICES) ? voiceValue : "Kore",
    preferredLanguage: isOneOf(languageValue, PREFERRED_LANGUAGES)
      ? languageValue
      : "English",
    autoInterrupt: configuration.get<boolean>("autoInterrupt", true),
    behavior: isOneOf(behaviorValue, BEHAVIORS)
      ? behaviorValue
      : "professional"
  };
}

export async function savePreferences(
  preferences: Preferences
): Promise<Preferences> {
  if (
    !isOneOf(preferences.voice, GEMINI_VOICES) ||
    !isOneOf(preferences.preferredLanguage, PREFERRED_LANGUAGES) ||
    !isOneOf(preferences.behavior, BEHAVIORS) ||
    typeof preferences.autoInterrupt !== "boolean"
  ) {
    throw new Error("One or more GeminiX settings are invalid.");
  }

  const configuration = vscode.workspace.getConfiguration("liveline");
  await Promise.all([
    configuration.update(
      "voice",
      preferences.voice,
      vscode.ConfigurationTarget.Global
    ),
    configuration.update(
      "preferredLanguage",
      preferences.preferredLanguage,
      vscode.ConfigurationTarget.Global
    ),
    configuration.update(
      "autoInterrupt",
      preferences.autoInterrupt,
      vscode.ConfigurationTarget.Global
    ),
    configuration.update(
      "behavior",
      preferences.behavior,
      vscode.ConfigurationTarget.Global
    )
  ]);

  return readPreferences();
}
