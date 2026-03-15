export class ProfileManager {
  static createEmptyProfile(name) {
    return {
      id: crypto.randomUUID(),
      name: name,
      data: {
        fullName: "",
        email: "",
        phone: "",
        dob: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        customFields: {}
      }
    };
  }

  static async getProfiles() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_profiles' }, (response) => {
        if (response && response.success) {
          resolve(response.profiles);
        } else {
          resolve([]);
        }
      });
    });
  }

  static async saveProfiles(profiles) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'save_profiles', profiles }, (response) => {
        resolve(response && response.success);
      });
    });
  }
}
