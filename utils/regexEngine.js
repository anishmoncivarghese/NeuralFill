export class RegexEngine {
  constructor() {
    this.dictionary = {
      fullName: /first.*name|last.*name|full.*name|name/i,
      email: /email|e-mail|mail/i,
      phone: /phone|mobile|cell|contact.*no/i,
      dob: /dob|date.*of.*birth|birth/i
    };
  }

  evaluateInput(input) {
    const attributesToEnforce = [input.id, input.name, input.placeholder, input.className];
    const combinedString = attributesToEnforce.filter(Boolean).join(' ').toLowerCase();

    for (const [fieldType, regex] of Object.entries(this.dictionary)) {
      if (regex.test(combinedString)) {
        return fieldType;
      }
    }
    return null;
  }
  
  isPasswordField(input) {
    if (input.type && input.type.toLowerCase() === 'password') {
      return true;
    }
    const combinedString = [input.id, input.name, input.placeholder].filter(Boolean).join(' ').toLowerCase();
    if (/password|pwd|passcode|secret/i.test(combinedString)) {
      return true;
    }
    return false;
  }
}
