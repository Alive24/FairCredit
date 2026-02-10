export interface ActivityModuleRef {
  moduleId: string; // The ID/Name of the module
  progress?: number; // Optional progress tracking
}

export interface ActivityData {
  title: string;
  description: string;
  evidenceLink?: string;
  modules: ActivityModuleRef[];
}
