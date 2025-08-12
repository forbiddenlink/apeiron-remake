import { GRID, PLAYER, ENEMIES, YUMMIES, SCORING } from './GameConfig';

// Deep clone an object
function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Get nested object value by path
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Set nested object value by path
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const lastPart = parts.pop()!;
  const target = parts.reduce((acc, part) => acc[part], obj);
  target[lastPart] = value;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private defaultConfigs: {
    GRID: typeof GRID;
    PLAYER: typeof PLAYER;
    ENEMIES: typeof ENEMIES;
    YUMMIES: typeof YUMMIES;
    SCORING: typeof SCORING;
  };
  private currentConfigs: {
    GRID: typeof GRID;
    PLAYER: typeof PLAYER;
    ENEMIES: typeof ENEMIES;
    YUMMIES: typeof YUMMIES;
    SCORING: typeof SCORING;
  };

  private constructor() {
    // Store default configurations
    this.defaultConfigs = {
      GRID: cloneDeep(GRID),
      PLAYER: cloneDeep(PLAYER),
      ENEMIES: cloneDeep(ENEMIES),
      YUMMIES: cloneDeep(YUMMIES),
      SCORING: cloneDeep(SCORING)
    };

    // Load saved configurations or use defaults
    const savedConfigs = localStorage.getItem('apeiron_configs');
    this.currentConfigs = savedConfigs
      ? JSON.parse(savedConfigs)
      : cloneDeep(this.defaultConfigs);
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // Update a specific configuration value
  updateConfig(path: string, value: any): void {
    const [section, ...rest] = path.split('.');
    if (section in this.currentConfigs) {
      setNestedValue(this.currentConfigs[section as keyof typeof this.currentConfigs], rest.join('.'), value);
      this.saveConfigs();
    }
  }

  // Get a specific configuration value
  getConfig(path: string): any {
    const [section, ...rest] = path.split('.');
    if (section in this.currentConfigs) {
      return getNestedValue(this.currentConfigs[section as keyof typeof this.currentConfigs], rest.join('.'));
    }
    return undefined;
  }

  // Reset all configurations to default values
  resetConfigs(): void {
    this.currentConfigs = cloneDeep(this.defaultConfigs);
    this.saveConfigs();
  }

  // Save current configurations to localStorage
  private saveConfigs(): void {
    try {
      localStorage.setItem('apeiron_configs', JSON.stringify(this.currentConfigs));
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  }

  // Get all current configurations
  getAllConfigs(): typeof this.currentConfigs {
    return this.currentConfigs;
  }

  // Export configurations to a file
  exportConfigs(): string {
    return JSON.stringify(this.currentConfigs, null, 2);
  }

  // Import configurations from a file
  importConfigs(configsJson: string): void {
    try {
      const configs = JSON.parse(configsJson);
      // Validate the structure matches our config types
      if (this.validateConfigStructure(configs)) {
        this.currentConfigs = configs;
        this.saveConfigs();
      }
    } catch (error) {
      console.error('Failed to import configurations:', error);
      throw new Error('Invalid configuration format');
    }
  }

  // Validate imported config structure
  private validateConfigStructure(configs: any): boolean {
    const requiredSections = ['GRID', 'PLAYER', 'ENEMIES', 'YUMMIES', 'SCORING'];
    return requiredSections.every(section => section in configs);
  }

  // Get the difference between current and default configs
  getDiff(): Record<string, { current: any; default: any }> {
    const diff: Record<string, { current: any; default: any }> = {};

    const compareObjects = (current: any, def: any, path = ''): void => {
      for (const key in current) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof current[key] === 'object' && current[key] !== null) {
          compareObjects(current[key], def[key], currentPath);
        } else if (current[key] !== def[key]) {
          diff[currentPath] = {
            current: current[key],
            default: def[key]
          };
        }
      }
    };

    compareObjects(this.currentConfigs, this.defaultConfigs);
    return diff;
  }
}
