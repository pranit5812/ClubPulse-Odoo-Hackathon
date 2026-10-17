const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const formatINR = (paise) => {
  if (paise === null || paise === undefined) return '₹0.00';
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(inr);
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('skyline_token') || localStorage.getItem('clubpulse_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let url = `${BASE_URL}${endpoint}`;
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  try {
    const { params, ...fetchOptions } = options;
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    // Handle CSV or file downloads
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
      if (!response.ok) throw new Error('File download failed');
      return await response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || 'An unexpected error occurred.';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options
    }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options })
};
