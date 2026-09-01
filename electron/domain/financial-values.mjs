export const MAX_MONEY_CENTS = 9_000_000_000_000_000;

export function requireIsoDate(value, name = 'Data') {
  const text = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new Error(`${name} deve usar YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${name} não existe no calendário.`);
  }
  return text;
}

export function moneyToCents(value, { name = 'Valor', allowNegative = false, allowZero = false } = {}) {
  const text = typeof value === 'number' ? String(value) : String(value ?? '').trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error(`${name} deve ter no máximo 2 casas decimais.`);
  const negative = text.startsWith('-');
  if (negative && !allowNegative) throw new Error(`${name} deve ser maior que zero.`);
  const [integer, decimal = ''] = text.replace('-', '').split('.');
  const cents = Number(integer) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS) throw new Error(`${name} está fora da faixa permitida.`);
  if (!allowZero && cents === 0) throw new Error(`${name} deve ser maior que zero.`);
  return negative ? -cents : cents;
}
