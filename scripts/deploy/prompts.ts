/**
 * Simple interactive prompts using Node.js readline.
 */

import * as readline from "readline";

export function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function question(
  rl: readline.Interface,
  prompt: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve((answer ?? "").trim()));
  });
}

export function choose<T>(
  rl: readline.Interface,
  message: string,
  choices: { value: T; label: string }[],
): Promise<T> {
  const text = choices.map((c, i) => `${i + 1}. ${c.label}`).join("\n");
  return new Promise((resolve, reject) => {
    rl.question(
      `${message}\n${text}\nChoice (1-${choices.length}): `,
      (answer) => {
        const idx = parseInt(answer ?? "0", 10);
        if (idx >= 1 && idx <= choices.length) {
          resolve(choices[idx - 1].value);
        } else {
          reject(new Error("Invalid choice"));
        }
      },
    );
  });
}

export function confirm(
  rl: readline.Interface,
  message: string,
  defaultValue = false,
): Promise<boolean> {
  const hint = defaultValue ? " (Y/n)" : " (y/N)";
  return new Promise((resolve) => {
    rl.question(`${message}${hint}: `, (answer) => {
      const s = (answer ?? "").trim().toLowerCase();
      if (s === "") resolve(defaultValue);
      else resolve(s === "y" || s === "yes");
    });
  });
}
