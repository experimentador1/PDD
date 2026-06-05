const FILE_KEY = "pdd_dacyti_excel";
const NAME_KEY = "pdd_dacyti_filename";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function persistUploadedFile(file: File): Promise<void> {
  const base64 = bufferToBase64(await file.arrayBuffer());
  localStorage.setItem(FILE_KEY, base64);
  localStorage.setItem(NAME_KEY, file.name);
}

export function loadPersistedFile(): File | null {
  const base64 = localStorage.getItem(FILE_KEY);
  const name = localStorage.getItem(NAME_KEY);
  if (!base64 || !name) return null;

  try {
    const buffer = base64ToBuffer(base64);
    return new File([buffer], name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch {
    return null;
  }
}

export function getPersistedFileName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function clearPersistedFile(): void {
  localStorage.removeItem(FILE_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function openPonenciasTab(): void {
  const url = `${window.location.origin}/ponencias`;
  window.open(url, "_blank", "noopener,noreferrer");
}
