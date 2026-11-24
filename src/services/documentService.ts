const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/documents`;
const COLLAB_API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/collaboration`;

export interface CloudDocument {
  _id: string;
  title: string;
  type: "Document" | "Whiteboard";
  content: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

function getHeaders() {
  const token = sessionStorage.getItem("collabspace-token");
  if (!token) throw new Error("Authentication token not found. Please log in again.");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getDocuments(): Promise<CloudDocument[]> {
  const response = await fetch(API_URL, { headers: getHeaders() });
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

export async function createDocument(
  title: string,
  type: "Document" | "Whiteboard",
  content = ""
): Promise<CloudDocument> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title, type, content }),
  });
  if (!response.ok) throw new Error("Failed to create document");
  return response.json();
}

export async function getDocument(id: string): Promise<CloudDocument> {
  const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error("Failed to fetch document");
  return response.json();
}

export async function updateDocument(
  id: string,
  updates: { title?: string; content?: string }
): Promise<CloudDocument> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update document");
  return response.json();
}

export async function initializeCollaboration(
  id: string,
  content: Record<string, unknown>
): Promise<{ initialized: boolean; message?: string }> {
  const response = await fetch(`${COLLAB_API_URL}/${id}/initialize`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error("Failed to initialize collaborative document");
  }

  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete document");
}

export async function getDocumentById(id: string): Promise<CloudDocument> {
  return getDocument(id);
}