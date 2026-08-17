const QUESTION_TYPES = ['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'YES_NO', 'SELECT', 'MULTI_SELECT', 'CHECKBOX'];
const CHOICE_TYPES = ['SELECT', 'MULTI_SELECT', 'CHECKBOX'];
const APPLICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'];

// يقبل ["a","b"] أو [{label,value}] ويرجع دايماً [{label,value}] نظيفة
function normalizeOptions(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((o) => {
      if (typeof o === 'string') {
        const v = o.trim();
        return v ? { label: v, value: v } : null;
      }
      if (o && typeof o === 'object') {
        const label = String(o.label ?? o.value ?? '').trim();
        const value = String(o.value ?? o.label ?? '').trim();
        return label && value ? { label, value } : null;
      }
      return null;
    })
    .filter(Boolean);
}

module.exports = { QUESTION_TYPES, CHOICE_TYPES, APPLICATION_STATUSES, normalizeOptions };
