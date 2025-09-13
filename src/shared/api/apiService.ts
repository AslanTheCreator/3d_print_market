import { isLoaded, getConfig, loadConfig } from "../config";

class ApiService {
  private async ensureConfigLoaded(): Promise<void> {
    if (!isLoaded()) {
      await loadConfig();
    }
  }

  async get(endpoint: string): Promise<any> {
    await this.ensureConfigLoaded();
    const { apiBaseUrl } = getConfig();
    const url = `${apiBaseUrl}${endpoint}`;

    console.log("Making API request to:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async post(endpoint: string, data?: any): Promise<any> {
    await this.ensureConfigLoaded();
    const { apiBaseUrl } = getConfig();
    const url = `${apiBaseUrl}${endpoint}`;

    console.log("Making API POST request to:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async put(endpoint: string, data?: any): Promise<any> {
    await this.ensureConfigLoaded();
    const { apiBaseUrl } = getConfig();
    const url = `${apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async delete(endpoint: string): Promise<any> {
    await this.ensureConfigLoaded();
    const { apiBaseUrl } = getConfig();
    const url = `${apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();
