// 순수 입력 파싱/검증 헬퍼 모음.
// index.js 분할(라우터화)의 1단계로, 외부 상태(query/app/appConfig)에 의존하지 않는
// 순수 함수만 모듈로 분리한다. 동작은 기존과 동일하다.

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeInt(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseBooleanFlag(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(text);
}

function parseDateTime(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function parseTimeZone(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: text }).format(new Date());
    return text;
  } catch (err) {
    return null;
  }
}

function parsePhoneNormalized(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('82') && normalized.length >= 10 && normalized.length <= 12) {
    normalized = `0${normalized.slice(2)}`;
  }
  if (normalized.length < 9 || normalized.length > 15) {
    return null;
  }
  return normalized;
}

function parseRole(value) {
  const role = String(value || '').trim().toUpperCase();
  if (!['TEACHER', 'STUDENT'].includes(role)) {
    return '';
  }
  return role;
}

function parseAdminRole(value) {
  const role = String(value || '').trim().toUpperCase();
  if (!['TEACHER', 'STUDENT', 'POWER_ADMIN'].includes(role)) {
    return '';
  }
  return role;
}

module.exports = {
  parsePositiveInt,
  parseNonNegativeInt,
  parseBooleanFlag,
  parseDateTime,
  parseTimeZone,
  parsePhoneNormalized,
  parseRole,
  parseAdminRole,
};
