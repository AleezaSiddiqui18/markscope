const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("markscope_token");
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Do not set Content-Type if FormData is used
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If token invalid, clean up unless checking demo switch
    if (!endpoint.includes("/auth/login") && !endpoint.includes("/auth/demo-switch")) {
      localStorage.removeItem("markscope_token");
      localStorage.removeItem("markscope_user");
    }
  }

  // Handle binary streams for file downloads
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("attachment")) {
    const blob = await response.blob();
    return { isBlob: true, blob, disposition };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || "An unexpected error occurred.";
    throw new Error(errorMsg);
  }

  return data;
}

export const authAPI = {
  login: (username, password) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  getProfile: () => apiRequest("/auth/me"),
  demoSwitch: (username) =>
    apiRequest(`/auth/demo-switch/${username}`, {
      method: "POST",
    }),
};

export const courseAPI = {
  list: () => apiRequest("/courses"),
  get: (id) => apiRequest(`/courses/${id}`),
  create: (courseData) =>
    apiRequest("/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    }),
  lock: (id) =>
    apiRequest(`/courses/${id}/lock`, {
      method: "POST",
    }),
  unlock: (id, reason) =>
    apiRequest(`/courses/${id}/unlock`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const marksAPI = {
  getConsolidated: (courseId) => apiRequest(`/courses/${courseId}/consolidated`),
  saveEntry: (courseId, entries) =>
    apiRequest(`/courses/${courseId}/marks/entry`, {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  getHistory: (courseId) => apiRequest(`/courses/${courseId}/marks/history`),
  exportCSV: (courseId) => apiRequest(`/courses/${courseId}/export/csv`),
  exportExcel: (courseId) => apiRequest(`/courses/${courseId}/export/excel`),
};

export const studentAPI = {
  getDashboard: (studentId) => apiRequest(`/students/${studentId}/dashboard`),
  explain: (studentId, courseId) => apiRequest(`/students/${studentId}/courses/${courseId}/explain`),
  whatIf: (studentId, courseId, simulatedComponents) =>
    apiRequest(`/students/${studentId}/courses/${courseId}/what-if`, {
      method: "POST",
      body: JSON.stringify({
        course_id: courseId,
        student_id: studentId,
        simulated_components: simulatedComponents,
      }),
    }),
  getDNA: (studentId, courseId) => apiRequest(`/students/${studentId}/courses/${courseId}/dna`),
  getTimeline: (studentId, courseId) => apiRequest(`/students/${studentId}/courses/${courseId}/timeline`),
};

export const excelAPI = {
  preview: (courseId, formData) =>
    apiRequest(`/courses/${courseId}/excel/preview`, {
      method: "POST",
      body: formData,
    }),
  confirm: (courseId, componentId, subtestName, previewData) =>
    apiRequest(`/courses/${courseId}/excel/confirm?component_id=${componentId}&subtest_name=${encodeURIComponent(subtestName)}`, {
      method: "POST",
      body: JSON.stringify(previewData),
    }),
  getConflicts: (courseId) => apiRequest(`/courses/${courseId}/excel/conflicts`),
  resolveConflict: (courseId, conflictId, action, reason) =>
    apiRequest(`/courses/${courseId}/excel/conflicts/resolve`, {
      method: "POST",
      body: JSON.stringify({ conflict_id: conflictId, action, reason }),
    }),
  downloadSample: (fileType) => apiRequest(`/samples/download/${fileType}`),
};

export const analyticsAPI = {
  getHealth: () => apiRequest("/analytics/health"),
  getAnomalies: (courseId) =>
    apiRequest(courseId ? `/analytics/anomalies?course_id=${courseId}` : "/analytics/anomalies"),
  getAuditLogs: (limit = 50) => apiRequest(`/analytics/audit-logs?limit=${limit}`),
};

export const disputeAPI = {
  create: (courseId, componentId, subtestName, reason) =>
    apiRequest("/disputes", {
      method: "POST",
      body: JSON.stringify({
        course_id: courseId,
        component_id: componentId,
        subtest_name: subtestName,
        reason,
      }),
    }),
  list: () => apiRequest("/disputes"),
  resolve: (ticketNo, status, facultyResponse, resolvedMark = null) =>
    apiRequest(`/disputes/${ticketNo}/resolve`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        faculty_response: facultyResponse,
        resolved_mark: resolvedMark,
      }),
    }),
};
