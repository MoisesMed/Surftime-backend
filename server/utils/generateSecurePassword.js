// Generates a strong random password that matches typical rules:
// - At least 8 chars
// - Uppercase, lowercase, number, special char
function generateSecurePassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{};:,.<>?";

  const all = uppercase + lowercase + numbers + symbols;

  const pick = (str) => str[Math.floor(Math.random() * str.length)];

  let password = "";
  password += pick(uppercase);
  password += pick(lowercase);
  password += pick(numbers);
  password += pick(symbols);

  // Add remaining random characters to total 10 chars
  for (let i = 4; i < 10; i++) {
    password += pick(all);
  }

  // Shuffle the password before returning
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

module.exports = generateSecurePassword;
