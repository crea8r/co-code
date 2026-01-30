import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

export async function editFile(
  filePath: string,
  searchText: string,
  replaceText: string,
  replaceAll = false
): Promise<{ replaced: number }>{
  const original = await fs.readFile(filePath, 'utf8');
  if (!original.includes(searchText)) {
    return { replaced: 0 };
  }

  const updated = replaceAll
    ? original.split(searchText).join(replaceText)
    : original.replace(searchText, replaceText);

  await fs.writeFile(filePath, updated, 'utf8');

  const replaced = replaceAll
    ? (original.split(searchText).length - 1)
    : 1;

  return { replaced };
}
