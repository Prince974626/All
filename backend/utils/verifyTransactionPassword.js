import bcrypt from 'bcryptjs';

/**
 * Verify transaction / master password (same rules as Bet Lock).
 * Superadmin may also use login password.
 */
export async function verifyTransactionPassword(user, enteredPassword) {
  if (!user || !enteredPassword) return false;

  const loginPasswordMatches = await bcrypt.compare(
    enteredPassword,
    user.password
  );
  const isSuperAdmin =
    user.role === 'supperadmin' || user.role === 'superadmin';

  if (user.masterPassword) {
    try {
      const transactionPasswordMatches = await bcrypt.compare(
        enteredPassword,
        user.masterPassword
      );
      return isSuperAdmin
        ? transactionPasswordMatches || loginPasswordMatches
        : transactionPasswordMatches;
    } catch {
      const legacyMasterMatches = user.masterPassword === enteredPassword;
      return isSuperAdmin
        ? legacyMasterMatches || loginPasswordMatches
        : legacyMasterMatches;
    }
  }

  return isSuperAdmin ? loginPasswordMatches : false;
}
