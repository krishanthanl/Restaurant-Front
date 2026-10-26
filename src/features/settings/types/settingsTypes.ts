// Mirrors RestaurantSettingsResponse; rowVersion is '' until the restaurant first saves its settings.
export interface RestaurantSettings { allowMultipleOrdersPerDiningSession: boolean; updatedAtUtc: string | null; rowVersion: string; }
export interface RestaurantSettingsInput { allowMultipleOrdersPerDiningSession: boolean; rowVersion: string; }
export const defaultRestaurantSettings: RestaurantSettings = { allowMultipleOrdersPerDiningSession: false, updatedAtUtc: null, rowVersion: '' };
