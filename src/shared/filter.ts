import { SfError } from '@salesforce/core';

export type SObjectClassifier = {
  isCustomObject: (name: string) => boolean;
  isManagedPackageObject: (name: string) => boolean;
};

export type SelectInput = {
  available: string[];
  standardInput?: string[];
  includeManaged: boolean;
  includeManagedNamespaces?: string[];
  classifier: SObjectClassifier;
};

export function validateStandardObjects(
  standardInput: string[] | undefined,
  available: string[],
  formatError: (name: string) => string
): void {
  if (standardInput == null) return;
  for (const name of standardInput) {
    if (!available.includes(name)) {
      throw new SfError(formatError(name));
    }
  }
}

export function selectSObjects(input: SelectInput): string[] {
  const { available, standardInput, includeManaged, includeManagedNamespaces, classifier } = input;

  return available.filter((name) => {
    if (classifier.isCustomObject(name) && !classifier.isManagedPackageObject(name)) {
      return true;
    }
    if (standardInput?.includes(name)) {
      return true;
    }
    if (includeManaged && classifier.isManagedPackageObject(name)) {
      return true;
    }
    if (includeManagedNamespaces != null && classifier.isManagedPackageObject(name)) {
      return includeManagedNamespaces.some((namespace) => name.startsWith(namespace));
    }
    return false;
  });
}
