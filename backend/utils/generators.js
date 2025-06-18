function generateSerial() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CMD-${datePart}-${randomPart}`;
}

module.exports = { generateSerial };
