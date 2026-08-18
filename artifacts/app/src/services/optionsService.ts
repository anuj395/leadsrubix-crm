import { optionRepository } from '../repositories/optionRepository';

export interface DynamicOptionItem {
  value: string;
  label: string;
  code?: string;
  flag?: string;
  badgeColor?: string;
  bgColor?: string;
}

export const optionsService = {
  /**
   * Dynamically fetch field option choices from backend API endpoint (/options) via optionRepository
   */
  async getOptions(fieldKey: string, category?: string): Promise<DynamicOptionItem[]> {
    try {
      const resData = await optionRepository.fetchRawOptions(fieldKey, category);
      const items = resData?.options || resData?.items || resData || [];

      if (Array.isArray(items) && items.length > 0) {
        return items.map((opt: any) =>
          typeof opt === 'string'
            ? { value: opt, label: opt }
            : {
                value: opt.value || opt.code || opt.id || opt.label,
                label: opt.label || opt.name || opt.value,
                code: opt.code,
                flag: opt.flag,
                badgeColor: opt.badgeColor,
                bgColor: opt.bgColor,
              }
        );
      }
      return [];
    } catch (err) {
      console.warn(`[optionsService] Server options endpoint unavailable for '${fieldKey}', using dynamic fallback:`, err);
      return [];
    }
  },
};
