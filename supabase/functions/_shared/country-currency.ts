export function countryCurrencyMatches(registeredCurrency: string, requestedCurrency: string): boolean {
  const registered = registeredCurrency.trim().toUpperCase();
  const requested = requestedCurrency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(registered) && /^[A-Z]{3}$/.test(requested) && registered === requested;
}
